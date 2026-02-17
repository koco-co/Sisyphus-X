import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Sparkles, ArrowRight, Github, Mail, Lock, Command, Cpu, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Typewriter from 'typewriter-effect';
import type { Container, Engine } from "@tsparticles/engine";
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
    const { t } = useTranslation()
    const { login, register, loginWithGithub, loginWithGoogle } = useAuth()
    const navigate = useNavigate()
    const { success, error: toastError } = useToast()

    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [init, setInit] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null)

    useEffect(() => {
        initParticlesEngine(async (engine: Engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = async (_container?: Container) => {
        // console.log(container);
    };

    // 邮箱格式验证
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    // 密码强度验证
    const checkPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
        if (password.length < 6) return 'weak'
        if (password.length < 10) return 'medium'
        return 'strong'
    }

    // 密码变更时更新强度
    useEffect(() => {
        if (password) {
            setPasswordStrength(checkPasswordStrength(password))
        } else {
            setPasswordStrength(null)
        }
    }, [password])

    // 计算表单是否有效
    const isFormValid = useMemo(() => {
        if (isLogin) {
            return email.trim() !== '' && password.trim() !== '' && isValidEmail(email)
        } else {
            return (
                username.trim() !== '' &&
                email.trim() !== '' &&
                password.trim() !== '' &&
                confirmPassword.trim() !== '' &&
                isValidEmail(email) &&
                password.length >= 6 &&
                password === confirmPassword &&
                agreedToTerms
            )
        }
    }, [isLogin, email, password, username, confirmPassword, agreedToTerms])

    const particlesOptions = useMemo(
        () => ({
            background: {
                color: {
                    value: "#09090b", // zinc-950
                },
            },
            fpsLimit: 120,
            interactivity: {
                events: {
                    onClick: {
                        enable: true,
                        mode: "push",
                    },
                    onHover: {
                        enable: true,
                        mode: "grab",
                    },
                },
                modes: {
                    push: {
                        quantity: 4,
                    },
                    grab: {
                        distance: 140,
                        links: {
                            opacity: 0.5,
                        },
                    },
                },
            },
            particles: {
                color: {
                    value: "#22d3ee", // cyan-400
                },
                links: {
                    color: "#a78bfa", // violet-400
                    distance: 150,
                    enable: true,
                    opacity: 0.2,
                    width: 1,
                },
                move: {
                    direction: "none" as const,
                    enable: true,
                    outModes: {
                        default: "bounce" as const,
                    },
                    random: false,
                    speed: 1,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 800,
                    },
                    value: 80,
                },
                opacity: {
                    value: 0.3,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 3 },
                },
            },
            detectRetina: true,
        }),
        [],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')

        // 注册时的额外验证
        if (!isLogin) {
            // 验证邮箱格式
            if (!isValidEmail(email)) {
                setError('请输入有效的邮箱地址')
                return
            }

            // 验证密码强度
            if (password.length < 6) {
                setError('密码长度至少为6位')
                return
            }

            // 验证确认密码
            if (password !== confirmPassword) {
                setError(t('auth.passwordMismatch'))
                return
            }

            // 验证用户协议
            if (!agreedToTerms) {
                setError('请阅读并同意用户协议和隐私政策')
                return
            }
        }

        setIsLoading(true)

        try {
            if (isLogin) {
                await login(email, password)
                success(t('auth.loginSuccess'))
                navigate('/')
            } else {
                await register(username, email, password)
                success('注册成功！正在跳转到首页...')
                // 立即跳转到首页
                navigate('/')
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } }
            const errorMessage = error.response?.data?.detail || t('auth.operationFailed')
            setError(errorMessage)
            toastError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex overflow-hidden font-sans">
            {/* Left Side - Dynamic Particles Background (60%) */}
            <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden bg-zinc-950 items-center justify-center lg:p-4 xl:p-12">
                {/* Particles Background */}
                <div className="absolute inset-0 z-0">
                    {init && (
                        <Particles
                            id="tsparticles"
                            particlesLoaded={particlesLoaded}
                            options={particlesOptions} // @ts-ignore
                            className="h-full w-full"
                        />
                    )}
                </div>

                {/* Content Overlay */}
                <motion.div
                    className="relative z-10 text-center max-w-2xl"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Cool Animated Logo */}
                    <div className="mb-12 relative flex justify-center">
                        <div className="relative w-24 h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40">
                            {/* Rotating Ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 border-l-purple-500/50"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                            <motion.div
                                className="absolute inset-4 rounded-full border-2 border-purple-500/20 border-b-purple-500 border-r-cyan-500/50"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Center Icon Cluster */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative z-20 bg-zinc-950/80 p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-2xl shadow-cyan-500/20">
                                    <div className="flex items-center justify-center gap-[-4px]">
                                        <Command className="w-10 h-10 text-cyan-400" />
                                        <Cpu className="w-8 h-8 text-purple-400 -ml-2" />
                                    </div>
                                    <div className="absolute -top-1 -right-1">
                                        <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Glow Effects */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                        </div>
                    </div>

                    <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white tracking-tight mb-6 drop-shadow-lg leading-tight p-2" style={{ fontFamily: "'Dancing Script', cursive" }}>
                        Sisyphus
                    </h1>

                    <div className="text-zinc-400 text-lg lg:text-xl font-light min-h-[3rem] flex items-center justify-center font-wenkai">
                        <Typewriter
                            options={{
                                strings: [
                                    '推石上山的永恒坚持',
                                    '在重复中寻找意义',
                                    '打破宿命的自动化力量',
                                    '重塑数字化时代的西西弗斯'
                                ],
                                autoStart: true,
                                loop: true,
                                delay: 80,
                                deleteSpeed: 50,
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Login Form (40%) */}
            <div className="w-full lg:w-[40%] flex items-center justify-center lg:p-4 xl:p-8 relative z-20">
                {/* Noise Texture Background Container */}
                <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-3xl border-l border-white/5 overflow-hidden">
                    {/* Noise Image Overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                        style={{ backgroundImage: `url('/images/noise.png')`, backgroundRepeat: 'repeat', backgroundSize: '100px 100px' }}
                    />

                    {/* Subtle Gradient Spots */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
                </div>

                <motion.div
                    className="w-full max-w-md relative z-30"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="mb-8">
                        {/* <div className="flex items-center gap-3 mb-4">
                            <CircuitBoard className="w-8 h-8 text-cyan-500" />
                            <h2 className="text-3xl font-bold text-white tracking-tight">Sisyphus</h2>
                        </div> */}
                        <h3 className="text-2xl font-bold text-white mb-2">{isLogin ? t('auth.login') : t('auth.register')}</h3>
                        <p className="text-zinc-400 text-sm">
                            {isLogin ? t('auth.welcomeBack') : t('auth.startJourney')}
                        </p>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <button
                            type="button"
                            onClick={loginWithGithub}
                            data-testid="github-login-button"
                            aria-label="使用 GitHub 登录"
                            className="flex-1 h-12 rounded-xl bg-[#24292e]/10 border border-[#24292e]/30 hover:bg-[#24292e]/20 hover:border-[#24292e]/40 transition-all flex items-center justify-center gap-2 text-white text-sm font-medium group backdrop-blur-sm shadow-lg shadow-black/20"
                        >
                            <Github className="w-5 h-5 text-[#fff] group-hover:text-white transition-colors" />
                            <span className="text-white">GitHub</span>
                        </button>
                        <button
                            type="button"
                            onClick={loginWithGoogle}
                            data-testid="google-login-button"
                            aria-label="使用 Google 登录"
                            className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-white text-sm font-medium group backdrop-blur-sm shadow-lg shadow-black/20"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 4.66c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span className="text-white">Google</span>
                        </button>
                    </div>

                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-2 text-zinc-500 backdrop-blur-md rounded-md">{t('auth.continueWith')}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? 'form-error' : undefined}>
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    key="username"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="group relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors z-10">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            data-testid="username-input"
                                            aria-label={t('auth.usernamePlaceholder')}
                                            aria-invalid={!username && !isLogin ? 'true' : 'false'}
                                            aria-required={!isLogin ? 'true' : 'false'}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all backdrop-blur-sm"
                                            placeholder={t('auth.usernamePlaceholder')}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="group relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors z-10">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (error && !isValidEmail(e.target.value)) {
                                        setError('')
                                    }
                                }}
                                onBlur={() => {
                                    if (email && !isValidEmail(email)) {
                                        setError('请输入有效的邮箱地址')
                                    }
                                }}
                                data-testid="email-input"
                                aria-label={t('auth.emailPlaceholder')}
                                aria-invalid={email && !isValidEmail(email) ? 'true' : 'false'}
                                aria-required="true"
                                aria-describedby={email && !isValidEmail(email) && error?.includes('邮箱') ? 'email-error' : undefined}
                                className={`w-full h-12 bg-white/5 border rounded-xl pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:bg-cyan-500/5 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all backdrop-blur-sm ${
                                    email && !isValidEmail(email) && error?.includes('邮箱')
                                        ? 'border-red-500/50 bg-red-500/5'
                                        : 'border-white/10 focus:border-cyan-500/50'
                                }`}
                                placeholder={t('auth.emailPlaceholder')}
                            />
                        </div>

                        <div className="group relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors z-10">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    if (error) setError('')
                                }}
                                data-testid="password-input"
                                aria-label={t('auth.passwordPlaceholder')}
                                aria-invalid={password && password.length < 6 ? 'true' : 'false'}
                                aria-required="true"
                                aria-describedby={!isLogin && password && passwordStrength ? 'password-strength' : undefined}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all backdrop-blur-sm"
                                placeholder={t('auth.passwordPlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="toggle-password-button"
                                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* 密码强度指示器 */}
                        {!isLogin && password && passwordStrength && (
                            <motion.div
                                id="password-strength"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 mt-2"
                                role="progressbar"
                                aria-valuenow={passwordStrength === 'weak' ? 33 : passwordStrength === 'medium' ? 66 : 100}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`密码强度：${passwordStrength === 'weak' ? '弱' : passwordStrength === 'medium' ? '中' : '强'}`}
                            >
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }}
                                        className={`h-full transition-colors ${
                                            passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                    />
                                </div>
                                <span className={`text-xs ${
                                    passwordStrength === 'weak' ? 'text-red-400' : passwordStrength === 'medium' ? 'text-yellow-400' : 'text-green-400'
                                }`}>
                                    {passwordStrength === 'weak' ? '弱' : passwordStrength === 'medium' ? '中' : '强'}
                                </span>
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    key="confirmPassword"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="group relative mt-5">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors z-10">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value)
                                                if (error && error.includes('密码')) setError('')
                                            }}
                                            data-testid="confirm-password-input"
                                            aria-label={t('auth.confirmPasswordPlaceholder')}
                                            aria-invalid={confirmPassword && password && confirmPassword !== password ? 'true' : 'false'}
                                            aria-required={!isLogin ? 'true' : 'false'}
                                            className={`w-full h-12 bg-white/5 border rounded-xl pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:bg-cyan-500/5 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all backdrop-blur-sm ${
                                                confirmPassword && password && confirmPassword !== password
                                                    ? 'border-red-500/50 bg-red-500/5'
                                                    : 'border-white/10 focus:border-cyan-500/50'
                                            }`}
                                            placeholder={t('auth.confirmPasswordPlaceholder')}
                                        />
                                        {confirmPassword && password && confirmPassword === password && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" aria-hidden="true">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 用户协议和隐私政策 */}
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    key="terms"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-4"
                                >
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative pt-1">
                                            <input
                                                type="checkbox"
                                                checked={agreedToTerms}
                                                onChange={(e) => {
                                                    setAgreedToTerms(e.target.checked)
                                                    if (error && error.includes('协议')) setError('')
                                                }}
                                                className="peer sr-only"
                                                data-testid="terms-checkbox"
                                            />
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                agreedToTerms
                                                    ? 'bg-cyan-500 border-cyan-500'
                                                    : 'border-white/20 bg-white/5 peer-hover:border-white/40'
                                            }`}>
                                                {agreedToTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                        <span className="text-xs text-zinc-400 leading-relaxed">
                                            我已阅读并同意{' '}
                                            <button
                                                type="button"
                                                className="text-cyan-400 hover:text-cyan-300 underline"
                                                onClick={() => window.open('/terms', '_blank')}
                                            >
                                                用户协议
                                            </button>
                                            {' '}和{' '}
                                            <button
                                                type="button"
                                                className="text-cyan-400 hover:text-cyan-300 underline"
                                                onClick={() => window.open('/privacy', '_blank')}
                                            >
                                                隐私政策
                                            </button>
                                        </span>
                                    </label>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 记住我 */}
                        {isLogin && (
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                        rememberMe
                                            ? 'bg-cyan-500 border-cyan-500'
                                            : 'border-white/20 bg-white/5 peer-hover:border-white/40'
                                    }`}>
                                        {rememberMe && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                </div>
                                <span className="text-sm text-zinc-400">{t('auth.rememberMe')}</span>
                            </label>
                        )}

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    id="form-error"
                                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2 backdrop-blur-sm"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <span className="mt-0.5" aria-hidden="true">⚠️</span>
                                    <span>{error}</span>
                                </motion.div>
                            )}
                            {successMessage && !error && (
                                <motion.div
                                    className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-2 backdrop-blur-sm"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    role="status"
                                    aria-live="polite"
                                >
                                    <CheckCircle2 className="w-4 h-4 mt-0.5" aria-hidden="true" />
                                    <span>{successMessage}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            type="submit"
                            disabled={isLoading || !isFormValid}
                            data-testid={isLogin ? "login-button" : "register-button"}
                            aria-label={isLogin ? '登录' : '注册'}
                            className="w-full h-12 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:from-violet-500 hover:via-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                            whileHover={isFormValid && !isLoading ? { scale: 1.02 } : {}}
                            whileTap={isFormValid && !isLoading ? { scale: 0.98 } : {}}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 transform skew-y-12" />
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                    <span className="relative z-10">{isLogin ? '登录中...' : '注册中...'}</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative z-10">{isLogin ? t('auth.login') : t('auth.createAccount')}</span>
                                    <ArrowRight className="w-4 h-4 relative z-10" aria-hidden="true" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-zinc-500 text-sm">
                            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                data-testid="toggle-auth-mode-button"
                                className="ml-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline"
                            >
                                {isLogin ? t('auth.register') : t('auth.login')}
                            </button>
                        </p>
                    </div>

                    <div className="mt-8 text-center text-xs text-zinc-600">
                        <p>{t('auth.copyright')}</p>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}


