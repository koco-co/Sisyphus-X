/**
 * 关键字列表组件
 *
 * 功能：
 * - 展示项目关键字列表
 * - 搜索和过滤
 * - 启用/禁用关键字
 * - 编辑和删除关键字
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react'

interface KeywordListProps {
  keywords?: Array<{
    id: string
    name: string
    func_name: string
    category?: string
    description?: string
    is_active: boolean
    created_at: string
  }>
  onEdit?: (keyword: any) => void
  onDelete?: (id: string) => void
  onToggle?: (id: string) => void
  onCreateNew?: () => void
}

export function KeywordList({
  keywords = [],
  onEdit,
  onDelete,
  onToggle,
  onCreateNew
}: KeywordListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // 过滤关键字
  const filteredKeywords = keywords.filter(kw => {
    const matchesSearch = kw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         kw.func_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || kw.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // 获取所有分类
  const categories = ['all', ...Array.from(new Set(keywords.map(kw => kw.category || 'other')))]

  return (
    <div className="keyword-list space-y-4" data-testid="keyword-list">
      {/* 工具栏 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索关键字..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="keyword-search-input"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
            data-testid="keyword-type-filter"
          >
            {categories.map(cat => (
              <option key={cat} value={cat} data-testid={`filter-option-${cat}`}>
                {cat === 'all' ? '所有分类' : cat}
              </option>
            ))}
          </select>

          <Button onClick={onCreateNew} data-testid="create-keyword-button">
            <Plus className="w-4 h-4 mr-2" />
            新建关键字
          </Button>
        </div>
      </Card>

      {/* 关键字列表 */}
      <div className="space-y-3">
        {filteredKeywords.length === 0 ? (
          <Card className="p-12 text-center text-gray-400">
            <p>暂无关键字</p>
            <p className="text-sm mt-2">点击"新建关键字"开始创建</p>
          </Card>
        ) : (
          filteredKeywords.map(keyword => (
            <Card key={keyword.id} className="p-4" data-testid="keyword-item" data-is-builtin="false">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg" data-testid="keyword-name">{keyword.name}</h3>
                    <Badge variant={keyword.is_active ? 'default' : 'secondary'} data-testid="keyword-type">
                      {keyword.func_name}
                    </Badge>
                    {keyword.category && (
                      <Badge variant="outline">{keyword.category}</Badge>
                    )}
                    {!keyword.is_active && (
                      <Badge variant="secondary" data-testid="readonly-badge">已禁用</Badge>
                    )}
                    <Badge variant="outline" data-testid="builtin-badge">自定义</Badge>
                  </div>

                  {keyword.description && (
                    <p className="text-sm text-gray-600 mb-2">{keyword.description}</p>
                  )}

                  <div className="text-xs text-gray-400" data-testid="keyword-usage-count">
                    创建时间：{new Date(keyword.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle?.(keyword.id)}
                    data-testid="keyword-enabled-switch"
                  >
                    {keyword.is_active ? (
                      <Power className="w-4 h-4 text-green-600" />
                    ) : (
                      <PowerOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(keyword)}
                    data-testid="edit-keyword-button"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete?.(keyword.id)}
                    data-testid="delete-keyword-button"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 统计信息 */}
      {keywords.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          共 {keywords.length} 个关键字
          {searchQuery && `，找到 ${filteredKeywords.length} 个匹配项`}
        </div>
      )}
    </div>
  )
}
