export function shouldShowInterfaceSelector(keywordType: string, keywordName: string): boolean {
  return keywordType === 'request' && ['HTTP请求', '发送请求'].includes(keywordName)
}
