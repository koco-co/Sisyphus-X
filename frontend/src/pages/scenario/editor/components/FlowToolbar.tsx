
import { useTranslation } from 'react-i18next';
import { Play, Save, Layout, Share2, MousePointer2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function FlowToolbar() {
    const { t } = useTranslation();

    return (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl">
                    <button className="p-2 rounded-xl text-white bg-cyan-500 shadow-lg shadow-cyan-500/20 hover:bg-cyan-600 transition-all">
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <Layout className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex items-center gap-2 shadow-2xl">
                    <button className="h-9 px-4 flex items-center gap-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                        <Share2 className="w-4 h-4" />
                        {t('common.share')}
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <button className="h-9 px-4 flex items-center gap-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                        <Save className="w-4 h-4" />
                        {t('common.save')}
                    </button>
                    <motion.button
                        className="h-9 px-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Play className="w-4 h-4 fill-white" />
                        {t('scenarios.runScenario')}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
