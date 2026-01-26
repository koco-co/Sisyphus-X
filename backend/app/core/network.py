import socket
import logging

logger = logging.getLogger(__name__)

def test_tcp_connection(host: str, port: int, timeout: int = 5) -> tuple[bool, str]:
    """
    测试 TCP 连接
    返回: (是否成功, 消息/错误信息)
    """
    try:
        # 简单的 TCP 连接测试
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            return True, "Success"
        else:
            return False, f"Connection failed (error code: {result})"
    except socket.timeout:
        return False, "Connection timed out"
    except Exception as e:
        return False, str(e)
