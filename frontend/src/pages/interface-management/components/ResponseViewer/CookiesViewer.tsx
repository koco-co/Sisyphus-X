import { Cookie } from 'lucide-react'

interface CookiesViewerProps {
  cookies?: Record<string, string>
}

export function CookiesViewer({ cookies }: CookiesViewerProps) {
  if (!cookies || Object.keys(cookies).length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Cookie className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>暂无 Cookies</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-slate-400 font-medium">Cookie</th>
              <th className="px-4 py-2 text-left text-slate-400 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cookies).map(([key, value]) => (
              <tr key={key} className="border-t border-slate-700">
                <td className="px-4 py-2 font-mono text-cyan-400">{key}</td>
                <td className="px-4 py-2 font-mono text-slate-300 break-all">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
