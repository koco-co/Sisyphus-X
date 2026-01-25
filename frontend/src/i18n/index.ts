import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 获取系统语言
const getSystemLanguage = (): string => {
    const browserLang = navigator.language || (navigator as any).userLanguage
    if (browserLang.startsWith('zh')) {
        return 'zh-CN'
    }
    return 'en-US'
}

// 从 localStorage 获取保存的语言，否则使用系统语言
const getSavedLanguage = (): string => {
    const saved = localStorage.getItem('sisyphus-language')
    return saved || getSystemLanguage()
}

i18n
    .use(initReactI18next)
    .init({
        resources: {
            'zh-CN': { translation: zhCN },
            'en-US': { translation: enUS }
        },
        lng: getSavedLanguage(),
        fallbackLng: 'zh-CN',
        interpolation: {
            escapeValue: false
        }
    })

// 监听语言变化并保存
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('sisyphus-language', lng)
})

export default i18n
