import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldAlert, Wrench, TrendingUp, Zap } from 'lucide-react';
import type { VehicleIntelligence, IntelligenceStatus } from '@/hooks/useVehicleIntelligence';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatKm(km: number) {
  return km >= 1000 ? `${(km / 1000).toFixed(0)}k` : String(km);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-purple-400 border border-purple-500/30 bg-purple-500/10 rounded-full px-2 py-0.5">
    <Sparkles size={9} />
    Estimativa por IA
  </span>
);

const CardShell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center justify-between mb-1">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs font-black uppercase tracking-widest text-zinc-300">{title}</span>
    </div>
    <AiBadge />
  </div>
);

// Skeleton shimmer card
const SkeletonCard = () => (
  <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
    <div className="flex items-center justify-between mb-1">
      <div className="h-4 w-32 bg-white/10 rounded-full" />
      <div className="h-4 w-24 bg-white/5 rounded-full" />
    </div>
    <div className="h-3 w-full bg-white/8 rounded-full" />
    <div className="h-3 w-3/4 bg-white/6 rounded-full" />
    <div className="h-3 w-5/6 bg-white/8 rounded-full" />
    <div className="h-3 w-2/3 bg-white/5 rounded-full" />
  </div>
);

// ─── Card: Roubo / Furto ─────────────────────────────────────────────────────

const NIVEL_CONFIG = {
  baixo:  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', label: 'BAIXO' },
  medio:  { bg: 'bg-amber-500/15',   border: 'border-amber-500/40',   text: 'text-amber-400',   label: 'MÉDIO' },
  alto:   { bg: 'bg-red-500/15',     border: 'border-red-500/40',     text: 'text-red-400',     label: 'ALTO'  },
};

function RouboFurtoCard({ data }: { data: VehicleIntelligence['roubo_furto'] }) {
  const nivel = data.nivel?.toLowerCase().replace('é', 'e') as 'baixo' | 'medio' | 'alto';
  const cfg = NIVEL_CONFIG[nivel] ?? NIVEL_CONFIG.medio;

  return (
    <CardShell>
      <CardHeader icon={<ShieldAlert size={15} className="text-red-400" />} title="Roubo & Furto" />
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
          Risco {cfg.label}
        </span>
        {data.ranking_nacional && (
          <span className="text-[10px] text-zinc-500 font-medium">#{data.ranking_nacional} no ranking nacional</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Recuperados</div>
          <div className="text-xl font-black text-white">{data.recuperacao_pct}%</div>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Nunca recuperados</div>
          <div className="text-xl font-black text-red-400">{data.nunca_recuperados_pct}%</div>
        </div>
      </div>
      {data.justificativa && (
        <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">{data.justificativa}</p>
      )}
    </CardShell>
  );
}

// ─── Card: Colisão / Peças ────────────────────────────────────────────────────

function ColisaoPecasCard({ data }: { data: VehicleIntelligence['colisao_pecas'] }) {
  const total = data.reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0);
  return (
    <CardShell>
      <CardHeader icon={<Zap size={15} className="text-orange-400" />} title="Colisão & Peças" />
      <div className="flex flex-col gap-1.5 mt-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[11px] text-zinc-300 font-medium">{item.peca}</span>
            <span className="text-[11px] font-black text-white">{formatCurrency(item.valor_estimado)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total estimado</span>
        <span className="text-sm font-black text-orange-400">{formatCurrency(total)}</span>
      </div>
    </CardShell>
  );
}

// ─── Card: Problemas Mecânicos ────────────────────────────────────────────────

function ProblemasMecanicosCard({ data }: { data: VehicleIntelligence['problemas_mecanicos'] }) {
  return (
    <CardShell>
      <CardHeader icon={<Wrench size={15} className="text-blue-400" />} title="Problemas Mecânicos" />
      <div className="flex flex-col gap-2 mt-1">
        {data.map((item, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-300 leading-relaxed flex-1">{item.problema}</span>
              <span className="text-[11px] font-black text-white shrink-0">{formatCurrency(item.valor_estimado)}</span>
            </div>
            <div className="mt-1.5 text-[10px] text-zinc-600 font-medium">
              Faixa: {formatKm(item.km_inicio)} — {formatKm(item.km_fim)} km
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

// ─── Card: Revenda ────────────────────────────────────────────────────────────

const DEMANDA_CONFIG = {
  baixa: { text: 'text-red-400',     label: 'BAIXA' },
  media: { text: 'text-amber-400',   label: 'MÉDIA' },
  alta:  { text: 'text-emerald-400', label: 'ALTA'  },
};

function RevendaCard({ data }: { data: VehicleIntelligence['revenda'] }) {
  const demanda = data.demanda?.toLowerCase().replace('é', 'e') as 'baixa' | 'media' | 'alta';
  const demCfg = DEMANDA_CONFIG[demanda] ?? DEMANDA_CONFIG.media;
  const scoreColor = data.score >= 7 ? 'text-emerald-400' : data.score >= 4 ? 'text-amber-400' : 'text-red-400';

  return (
    <CardShell>
      <CardHeader icon={<TrendingUp size={15} className="text-emerald-400" />} title="Revenda & Liquidez" />
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Score de Revenda</div>
          <div className={`text-2xl font-black ${scoreColor}`}>{data.score}<span className="text-xs text-zinc-600 font-medium">/10</span></div>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Demanda</div>
          <div className={`text-xl font-black ${demCfg.text}`}>{demCfg.label}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Dias p/ vender</div>
          <div className="text-xl font-black text-white">~{data.dias_para_vender}d</div>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Depreciação/ano</div>
          <div className="text-xl font-black text-white">{data.depreciacao_anual_pct}%</div>
        </div>
      </div>
      {data.justificativa && (
        <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">{data.justificativa}</p>
      )}
    </CardShell>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
  status: IntelligenceStatus;
  data: VehicleIntelligence | null;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export const VehicleIntelligenceSection: React.FC<Props> = ({ status, data }) => {
  if (status === 'error' || status === 'idle') return null;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-1 bg-purple-500 rounded-full" />
        <span className="text-white font-black tracking-widest text-sm uppercase">Inteligência do Veículo</span>
        <Sparkles size={13} className="text-purple-400" />
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      <AnimatePresence>
        {status === 'success' && data && (
          <motion.div
            key="intelligence-cards"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4"
          >
            <motion.div variants={cardVariants}>
              <RouboFurtoCard data={data.roubo_furto} />
            </motion.div>
            <motion.div variants={cardVariants}>
              <ColisaoPecasCard data={data.colisao_pecas} />
            </motion.div>
            <motion.div variants={cardVariants}>
              <ProblemasMecanicosCard data={data.problemas_mecanicos} />
            </motion.div>
            <motion.div variants={cardVariants}>
              <RevendaCard data={data.revenda} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── PDF version (static, for pdfRef rendering) ───────────────────────────────

export const VehicleIntelligencePdfPage: React.FC<{ data: VehicleIntelligence }> = ({ data }) => {
  const total = data.colisao_pecas.reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0);
  const nivel = data.roubo_furto.nivel?.toLowerCase().replace('é','e') as 'baixo'|'medio'|'alto';
  const nivelLabel = { baixo: 'BAIXO', medio: 'MÉDIO', alto: 'ALTO' }[nivel] ?? nivel.toUpperCase();
  const nivelColor = { baixo: '#10b981', medio: '#f59e0b', alto: '#ef4444' }[nivel] ?? '#f59e0b';
  const demanda = data.revenda.demanda?.toLowerCase().replace('é','e') as 'baixa'|'media'|'alta';
  const demandaLabel = { baixa: 'BAIXA', media: 'MÉDIA', alta: 'ALTA' }[demanda] ?? demanda.toUpperCase();
  const scoreColor = data.revenda.score >= 7 ? '#10b981' : data.revenda.score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      backgroundColor: '#080F1E',
      color: '#E2E8F0',
      width: '800px',
      minHeight: '1131px',
      padding: '48px 40px',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#fff' }}>
          Inteligência do Veículo
        </div>
        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '2px', color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '999px', padding: '4px 10px', textTransform: 'uppercase' }}>
          ✦ Estimativa por IA
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Roubo & Furto */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '2px', color: '#ef4444', textTransform: 'uppercase', marginBottom: '10px' }}>Roubo & Furto</div>
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: `${nivelColor}22`, border: `1px solid ${nivelColor}66`, color: nivelColor, fontSize: '11px', fontWeight: 900, letterSpacing: '1px', marginBottom: '12px' }}>
            Risco {nivelLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Recuperados</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>{data.roubo_furto.recuperacao_pct}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Nunca recup.</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>{data.roubo_furto.nunca_recuperados_pct}%</div>
            </div>
          </div>
          {data.roubo_furto.ranking_nacional && <div style={{ fontSize: '9px', color: '#71717a', marginBottom: '6px' }}>#{data.roubo_furto.ranking_nacional} no ranking nacional</div>}
          <div style={{ fontSize: '10px', color: '#a1a1aa', lineHeight: '1.5' }}>{data.roubo_furto.justificativa}</div>
        </div>

        {/* Revenda */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '2px', color: '#10b981', textTransform: 'uppercase', marginBottom: '10px' }}>Revenda & Liquidez</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Score</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: scoreColor }}>{data.revenda.score}<span style={{ fontSize: '10px', color: '#52525b', fontWeight: 500 }}>/10</span></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Demanda</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{demandaLabel}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Dias p/ vender</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>~{data.revenda.dias_para_vender}d</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Depreciação/ano</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>{data.revenda.depreciacao_anual_pct}%</div>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#a1a1aa', lineHeight: '1.5' }}>{data.revenda.justificativa}</div>
        </div>

        {/* Colisão & Peças */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '2px', color: '#f97316', textTransform: 'uppercase', marginBottom: '12px' }}>Colisão & Peças</div>
          {data.colisao_pecas.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < data.colisao_pecas.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span style={{ fontSize: '10px', color: '#d4d4d8', fontWeight: 500 }}>{item.peca}</span>
              <span style={{ fontSize: '10px', color: '#fff', fontWeight: 800 }}>{formatCurrency(item.valor_estimado)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#71717a', letterSpacing: '1px', textTransform: 'uppercase' }}>Total estimado</span>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#f97316' }}>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Problemas Mecânicos */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '2px', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '12px' }}>Problemas Mecânicos</div>
          {data.problemas_mecanicos.map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '10px', color: '#d4d4d8', fontWeight: 600, flex: 1, paddingRight: '8px' }}>{item.problema}</span>
                <span style={{ fontSize: '10px', color: '#fff', fontWeight: 800, flexShrink: 0 }}>{formatCurrency(item.valor_estimado)}</span>
              </div>
              <div style={{ fontSize: '9px', color: '#52525b', fontWeight: 500 }}>
                Faixa: {formatKm(item.km_inicio)} — {formatKm(item.km_fim)} km
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer disclaimer */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ fontSize: '9px', color: '#52525b', letterSpacing: '0.5px', fontStyle: 'italic' }}>
          ✦ Estimativas geradas por IA com base em padrões do mercado brasileiro. Não representam dados estatísticos oficiais. ✦
        </p>
      </div>
    </div>
  );
};