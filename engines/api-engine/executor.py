"""
api-engine 核心执行器

解析 YAML 测试用例并执行，输出标准 JSON 结果
"""

import yaml
import httpx
import time
import asyncio
import re
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class StepResult:
    """步骤执行结果"""
    id: str
    name: str
    type: str
    status: str  # success, failed, skipped, error
    start_time: str
    duration: float
    request: Optional[Dict] = None
    response: Optional[Dict] = None
    extract_result: Optional[Dict] = None
    validate_result: Optional[List[Dict]] = None
    attachment: Optional[str] = None
    logs: Optional[str] = None
    variables_mapping: Dict = field(default_factory=dict)


class TestExecutor:
    """测试执行器"""
    
    def __init__(
        self,
        yaml_path: Path,
        base_url_override: Optional[str] = None,
        timeout_override: Optional[int] = None,
        verbose: bool = False
    ):
        self.yaml_path = yaml_path
        self.base_url_override = base_url_override
        self.timeout_override = timeout_override
        self.verbose = verbose
        
        # 加载 YAML
        with open(yaml_path, 'r', encoding='utf-8') as f:
            self.test_data = yaml.safe_load(f)
        
        # 配置
        self.config = self.test_data.get('config', {})
        self.base_url = base_url_override or self.config.get('base_url', '')
        self.timeout = timeout_override or self.config.get('timeout', 30)
        self.variables = dict(self.config.get('variables', {}))
        
        # 步骤
        self.teststeps = self.test_data.get('teststeps', [])
        
        # 结果
        self.results: List[StepResult] = []
    
    def validate(self) -> List[str]:
        """验证 YAML 格式"""
        errors = []
        
        if 'config' not in self.test_data:
            errors.append("缺少 'config' 配置块")
        elif 'name' not in self.test_data['config']:
            errors.append("config 中缺少 'name' 字段")
        
        if 'teststeps' not in self.test_data:
            errors.append("缺少 'teststeps' 测试步骤")
        elif not isinstance(self.test_data['teststeps'], list):
            errors.append("'teststeps' 必须是列表")
        else:
            for i, step in enumerate(self.test_data['teststeps']):
                if 'name' not in step:
                    errors.append(f"步骤 {i+1} 缺少 'name' 字段")
                if 'type' not in step:
                    errors.append(f"步骤 {i+1} 缺少 'type' 字段")
        
        return errors
    
    def run(self) -> Dict:
        """执行所有测试步骤"""
        start_time = datetime.utcnow()
        
        for step in self.teststeps:
            result = self._execute_step(step)
            self.results.append(result)
            
            # 如果步骤失败，可以选择是否继续
            if result.status == 'failed':
                if self.verbose:
                    print(f"步骤失败: {step.get('name')}")
        
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        # 统计
        total = len(self.results)
        success = sum(1 for r in self.results if r.status == 'success')
        failed = sum(1 for r in self.results if r.status == 'failed')
        skipped = sum(1 for r in self.results if r.status == 'skipped')
        error = sum(1 for r in self.results if r.status == 'error')
        
        overall_status = 'success' if failed == 0 and error == 0 else 'failed'
        
        return {
            'summary': {
                'task_name': self.config.get('name', 'Unnamed Test'),
                'status': overall_status,
                'start_time': start_time.isoformat() + 'Z',
                'duration': round(duration, 3),
                'stat': {
                    'total': total,
                    'success': success,
                    'failed': failed,
                    'skipped': skipped,
                    'error': error
                },
                'env': {
                    'base_url': self.base_url,
                    'server': 'sisyphus-api-engine'
                }
            },
            'details': [self._result_to_dict(r) for r in self.results]
        }
    
    def _execute_step(self, step: Dict) -> StepResult:
        """执行单个步骤"""
        step_id = step.get('id', f"step_{len(self.results)+1}")
        step_name = step.get('name', 'Unnamed Step')
        step_type = step.get('type', 'api')
        
        start_time = datetime.utcnow()
        
        try:
            if step_type == 'api':
                return self._execute_api_step(step, step_id, step_name, start_time)
            elif step_type == 'wait':
                return self._execute_wait_step(step, step_id, step_name, start_time)
            elif step_type == 'database':
                return self._execute_db_step(step, step_id, step_name, start_time)
            else:
                return StepResult(
                    id=step_id,
                    name=step_name,
                    type=step_type,
                    status='skipped',
                    start_time=start_time.isoformat() + 'Z',
                    duration=0,
                    attachment=f"不支持的步骤类型: {step_type}"
                )
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            return StepResult(
                id=step_id,
                name=step_name,
                type=step_type,
                status='error',
                start_time=start_time.isoformat() + 'Z',
                duration=round(duration, 3),
                logs=str(e)
            )
    
    def _execute_api_step(self, step: Dict, step_id: str, step_name: str, start_time: datetime) -> StepResult:
        """执行 API 请求步骤"""
        request_config = step.get('request', {})
        method = request_config.get('method', 'GET').upper()
        url = self._resolve_variables(request_config.get('url', ''))
        
        # 拼接 base_url
        if url and not url.startswith('http'):
            url = self.base_url.rstrip('/') + '/' + url.lstrip('/')
        
        # 解析请求参数
        headers = {k: self._resolve_variables(v) for k, v in request_config.get('headers', {}).items()}
        params = {k: self._resolve_variables(v) for k, v in request_config.get('params', {}).items()}
        
        # 请求体
        json_body = request_config.get('json')
        form_data = request_config.get('data')
        
        if json_body:
            json_body = self._resolve_dict_variables(json_body)
        if form_data:
            form_data = self._resolve_dict_variables(form_data)
        
        # 发送请求
        with httpx.Client(timeout=self.timeout) as client:
            response = client.request(
                method=method,
                url=url,
                headers=headers,
                params=params if params else None,
                json=json_body,
                data=form_data
            )
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        # 解析响应
        try:
            response_body = response.json()
        except:
            response_body = response.text
        
        # 变量提取
        extract_result = {}
        for var_name, path in step.get('extract', {}).items():
            value = self._extract_value(path, response, response_body)
            extract_result[var_name] = value
            self.variables[var_name] = value
        
        # 断言验证
        validate_result = []
        all_passed = True
        for assertion in step.get('validate', []):
            for comparator, args in assertion.items():
                check_result = self._validate(comparator, args, response, response_body)
                validate_result.append(check_result)
                if check_result['result'] == 'fail':
                    all_passed = False
        
        return StepResult(
            id=step_id,
            name=step_name,
            type='api',
            status='success' if all_passed else 'failed',
            start_time=start_time.isoformat() + 'Z',
            duration=round(duration, 3),
            request={
                'url': url,
                'method': method,
                'headers': headers,
                'body': json_body or form_data
            },
            response={
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'body': response_body
            },
            extract_result=extract_result if extract_result else None,
            validate_result=validate_result if validate_result else None,
            variables_mapping=extract_result
        )
    
    def _execute_wait_step(self, step: Dict, step_id: str, step_name: str, start_time: datetime) -> StepResult:
        """执行等待步骤"""
        duration_ms = step.get('duration_ms', step.get('wait', 1000))
        time.sleep(duration_ms / 1000)
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        return StepResult(
            id=step_id,
            name=step_name,
            type='wait',
            status='success',
            start_time=start_time.isoformat() + 'Z',
            duration=round(duration, 3),
            attachment=f"等待 {duration_ms}ms"
        )
    
    def _execute_db_step(self, step: Dict, step_id: str, step_name: str, start_time: datetime) -> StepResult:
        """执行数据库步骤 (占位实现)"""
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        return StepResult(
            id=step_id,
            name=step_name,
            type='database',
            status='skipped',
            start_time=start_time.isoformat() + 'Z',
            duration=round(duration, 3),
            attachment="数据库操作暂未实现"
        )
    
    def _resolve_variables(self, value: str) -> str:
        """解析变量 ${var_name}"""
        if not isinstance(value, str):
            return value
        
        pattern = r'\$\{(\w+)\}'
        
        def replacer(match):
            var_name = match.group(1)
            return str(self.variables.get(var_name, match.group(0)))
        
        return re.sub(pattern, replacer, value)
    
    def _resolve_dict_variables(self, data: Dict) -> Dict:
        """递归解析字典中的变量"""
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self._resolve_variables(value)
            elif isinstance(value, dict):
                result[key] = self._resolve_dict_variables(value)
            elif isinstance(value, list):
                result[key] = [self._resolve_variables(v) if isinstance(v, str) else v for v in value]
            else:
                result[key] = value
        return result
    
    def _extract_value(self, path: str, response: httpx.Response, body: Any) -> Any:
        """从响应中提取值"""
        if path == 'status_code':
            return response.status_code
        elif path.startswith('headers.'):
            header_name = path[8:]
            return response.headers.get(header_name)
        elif path.startswith('body.'):
            keys = path[5:].split('.')
            value = body
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                else:
                    return None
            return value
        return None
    
    def _validate(self, comparator: str, args: List, response: httpx.Response, body: Any) -> Dict:
        """执行断言验证"""
        check_path = args[0]
        expected = args[1] if len(args) > 1 else None
        
        # 获取实际值
        if check_path == 'status_code':
            actual = response.status_code
        elif check_path.startswith('body.'):
            actual = self._extract_value(check_path, response, body)
        else:
            actual = None
        
        # 比较
        passed = False
        if comparator == 'eq':
            passed = actual == expected
        elif comparator == 'ne':
            passed = actual != expected
        elif comparator == 'gt':
            passed = actual > expected
        elif comparator == 'ge':
            passed = actual >= expected
        elif comparator == 'lt':
            passed = actual < expected
        elif comparator == 'le':
            passed = actual <= expected
        elif comparator == 'contains':
            passed = expected in actual if actual else False
        elif comparator == 'len_gt':
            passed = len(actual) > expected if actual else False
        elif comparator == 'len_eq':
            passed = len(actual) == expected if actual else False
        
        result = {
            'check': check_path,
            'expect': expected,
            'actual': actual,
            'result': 'pass' if passed else 'fail'
        }
        
        if not passed:
            result['error_msg'] = f"断言失败: {check_path} {comparator} {expected}, 实际值: {actual}"
        
        return result
    
    def _result_to_dict(self, result: StepResult) -> Dict:
        """将 StepResult 转为字典"""
        d = asdict(result)
        # 移除 None 值
        return {k: v for k, v in d.items() if v is not None}
