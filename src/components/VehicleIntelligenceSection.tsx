import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Wrench, TrendingUp, Sparkles, User, Phone } from 'lucide-react';
import type { VehicleIntelligence, IntelligenceStatus } from '@/hooks/useVehicleIntelligence';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  if (!value && value !== 0) return 'R$ 0';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function getPecaEmoji(peca: string, customEmoji?: string): string {
  if (customEmoji) return customEmoji;
  const lower = peca.toLowerCase();
  if (lower.includes('farol')) return '💡';
  if (lower.includes('capô') || lower.includes('capo')) return '🔧';
  if (lower.includes('brisa') || lower.includes('vidro')) return '🪟';
  if (lower.includes('choque') || lower.includes('parachoque')) return '🚧';
  if (lower.includes('retrovisor') || lower.includes('espelho')) return '🪞';
  if (lower.includes('radiador') || lower.includes('arrefecimento')) return '💧';
  if (lower.includes('grade')) return '🏁';
  if (lower.includes('lama') || lower.includes('paralama')) return '🛡️';
  if (lower.includes('porta') || lower.includes('tampa')) return '🚪';
  if (lower.includes('roda') || lower.includes('pneu')) return '🛞';
  return '⚙️';
}

function getKmFaixa(item: { km_faixa?: string; km_inicio?: number; km_fim?: number }): string {
  if (item.km_faixa) return item.km_faixa;
  if (item.km_inicio != null && item.km_fim != null) {
    const i = item.km_inicio >= 1000 ? `${(item.km_inicio / 1000).toFixed(0)}.000` : String(item.km_inicio);
    const f = item.km_fim >= 1000 ? `${(item.km_fim / 1000).toFixed(0)}.000` : String(item.km_fim);
    return `${i} - ${f} km`;
  }
  return 'Conforme desgaste';
}

// ─── Sub-components (UI) ─────────────────────────────────────────────────────

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sky-300 border border-sky-400/30 bg-sky-500/10 rounded-full px-2.5 py-0.5 shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.1)]">
    <Sparkles size={10} className="text-sky-300" />
    ESTIMATIVA IA
  </span>
);

const SkeletonCard = () => (
  <div className="bg-[#0B132B]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
    <div className="flex items-center justify-between mb-1">
      <div className="h-4 w-36 bg-white/10 rounded-full" />
      <div className="h-4 w-24 bg-white/5 rounded-full" />
    </div>
    <div className="h-3.5 w-full bg-white/5 rounded-full" />
    <div className="h-3.5 w-4/5 bg-white/5 rounded-full" />
    <div className="grid grid-cols-2 gap-2.5 mt-2">
      <div className="h-14 bg-white/5 rounded-xl" />
      <div className="h-14 bg-white/5 rounded-xl" />
    </div>
  </div>
);

// ─── Card 1: Roubo / Furto ────────────────────────────────────────────────────

function RouboFurtoCard({ data }: { data: VehicleIntelligence['roubo_furto'] }) {
  const nivelStr = String(data.nivel || 'MÉDIO').toUpperCase();
  const rankingTxt = data.ranking_nacional_texto || (data.ranking_nacional ? `#${data.ranking_nacional}º no ranking dos mais roubados no Brasil` : 'Entre os mais visados do país');

  return (
    <div className="bg-[#0B132B]/95 border border-red-500/35 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(239,68,68,0.06)] flex flex-col gap-3 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm font-bold text-red-400 tracking-wide uppercase">Roubo / Furto</span>
        </div>
        <AiBadge />
      </div>

      {/* Justificativa */}
      {data.justificativa && (
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {data.justificativa}
        </p>
      )}

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-1">
        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">NÍVEL</div>
          <div className="text-sm sm:text-base font-black text-white uppercase">{nivelStr}</div>
        </div>

        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">RECUPERAÇÃO</div>
          <div className="text-base sm:text-lg font-black text-white">{data.recuperacao_pct}%</div>
        </div>

        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">NUNCA RECUPERADOS</div>
          <div className="text-base sm:text-lg font-black text-white">{data.nunca_recuperados_pct}%</div>
        </div>

        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">RANKING</div>
          <div className="text-xs sm:text-sm font-bold text-white leading-tight">{rankingTxt}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Card 2: Colisão · Peças ──────────────────────────────────────────────────

function ColisaoPecasCard({ data }: { data: VehicleIntelligence['colisao_pecas'] }) {
  const total = data.reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0);

  return (
    <div className="bg-[#0B132B]/95 border border-yellow-500/35 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(234,179,8,0.06)] flex flex-col gap-3 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-yellow-400 shrink-0" />
          <span className="text-sm font-bold text-yellow-400 tracking-wide uppercase">Colisão · Peças</span>
        </div>
        <AiBadge />
      </div>

      {/* Lista de Peças */}
      <div className="flex flex-col mt-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm shrink-0">{getPecaEmoji(item.peca, item.emoji)}</span>
              <span className="text-xs sm:text-sm text-slate-200 font-medium truncate">{item.peca}</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white font-mono shrink-0">
              {formatCurrency(item.valor_estimado)}
            </span>
          </div>
        ))}
      </div>

      {/* Total estimado */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1">
        <span className="text-xs sm:text-sm font-bold text-sky-300 uppercase tracking-wide">Total estimado</span>
        <span className="text-base sm:text-lg font-black text-white font-mono">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ─── Card 3: Problemas Mecânicos ──────────────────────────────────────────────

function ProblemasMecanicosCard({ data }: { data: VehicleIntelligence['problemas_mecanicos'] }) {
  return (
    <div className="bg-[#0B132B]/95 border border-sky-500/35 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(14,165,233,0.06)] flex flex-col gap-3 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-sky-400 shrink-0" />
          <span className="text-sm font-bold text-sky-400 tracking-wide uppercase">Problemas mecânicos</span>
        </div>
        <AiBadge />
      </div>

      {/* Lista de Problemas */}
      <div className="flex flex-col mt-1">
        {data.map((item, i) => (
          <div key={i} className="py-2.5 border-b border-white/5 last:border-0 flex items-start justify-between gap-3">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-white leading-snug">{item.problema}</span>
              <span className="text-[11px] text-sky-400 font-medium mt-0.5">
                • {getKmFaixa(item)}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white font-mono shrink-0 pt-0.5">
              {formatCurrency(item.valor_estimado)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card 4: Revenda ──────────────────────────────────────────────────────────

function RevendaCard({ data }: { data: VehicleIntelligence['revenda'] }) {
  const scoreStr = typeof data.score === 'number' ? (Number.isInteger(data.score) ? data.score.toFixed(1) : String(data.score)) : String(data.score || '8.5');
  const demandaStr = String(data.demanda || 'Alta');
  const diasStr = data.dias_para_vender ? `${data.dias_para_vender}` : '30';
  const depStr = data.depreciacao_anual_pct ? `${data.depreciacao_anual_pct}%` : '8.5%';

  return (
    <div className="bg-[#0B132B]/95 border border-emerald-500/35 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(16,185,129,0.06)] flex flex-col gap-3 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-bold text-emerald-400 tracking-wide uppercase">Revenda</span>
        </div>
        <AiBadge />
      </div>

      {/* Justificativa */}
      {data.justificativa && (
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {data.justificativa}
        </p>
      )}

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-1">
        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">SCORE</div>
          <div className="text-base sm:text-lg font-black text-white">{scoreStr}</div>
        </div>

        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">DEMANDA</div>
          <div className="text-sm sm:text-base font-black text-white">{demandaStr}</div>
        </div>

        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">DIAS P/ VENDER</div>
          <div className="text-sm sm:text-base font-black text-white">{diasStr}</div>
        </div>

        <div className="bg-[#131E38]/80 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-0.5">DEPRECIAÇÃO ANUAL</div>
          <div className="text-sm sm:text-base font-black text-white">{depStr}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Card 5: Consultor ────────────────────────────────────────────────────────

function ConsultorCard({ consultor }: { consultor?: { nome?: string; telefone?: string } | null }) {
  if (!consultor?.nome && !consultor?.telefone) return null;

  return (
    <div className="bg-[#0B132B]/95 border border-blue-500/25 rounded-2xl p-4 shadow-[0_0_20px_rgba(59,130,246,0.05)] flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Seu consultor</span>
      {consultor.nome && (
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <User size={15} className="text-sky-400" />
          <span>{consultor.nome}</span>
        </div>
      )}
      {consultor.telefone && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Phone size={14} className="text-sky-400" />
          <span>{consultor.telefone}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Screen Component ────────────────────────────────────────────────────

interface Props {
  status: IntelligenceStatus;
  data: VehicleIntelligence | null;
  consultor?: { nome?: string; telefone?: string } | null;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export const VehicleIntelligenceSection: React.FC<Props> = ({ status, data, consultor }) => {
  if (status === 'error' || status === 'idle') return null;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
          <span className="text-white font-black tracking-wider text-sm uppercase">Inteligência do Veículo</span>
        </div>
        <AiBadge />
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-3.5">
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
            className="grid grid-cols-1 gap-3.5"
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
            {consultor && (
              <motion.div variants={cardVariants}>
                <ConsultorCard consultor={consultor} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── PDF Static Page (Solid Dark Mode, High Contrast) ─────────────────────────

interface PdfPageProps {
  data: VehicleIntelligence;
  veiculoInfo?: { modelo?: string; placa?: string; ano?: string };
  consultor?: { nome?: string; telefone?: string } | null;
  associationName?: string;
}

export const VehicleIntelligencePdfPage: React.FC<PdfPageProps> = ({
  data,
  veiculoInfo,
  consultor,
  associationName,
}) => {
  const totalColisao = data.colisao_pecas.reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0);
  const nivelStr = String(data.roubo_furto.nivel || 'MÉDIO').toUpperCase();
  const rankingTxt = data.roubo_furto.ranking_nacional_texto || (data.roubo_furto.ranking_nacional ? `#${data.roubo_furto.ranking_nacional}º no ranking dos mais roubados no Brasil` : 'Entre os mais visados do país');
  const scoreStr = typeof data.revenda.score === 'number' ? (Number.isInteger(data.revenda.score) ? data.revenda.score.toFixed(1) : String(data.revenda.score)) : String(data.revenda.score || '8.5');

  return (
    <div
      data-theme="dark"
      className="dark-pdf-page"
      style={{
        backgroundColor: '#080F1E',
        color: '#E2E8F0',
        width: '800px',
        minHeight: '1131px',
        padding: '36px 36px',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      {/* ── Top Header ── */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            paddingBottom: '14px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.5px' }}>
              {veiculoInfo?.modelo || 'Relatório de Inteligência Veicular'}
              {veiculoInfo?.placa ? ` · Placa ${veiculoInfo.placa}` : ''}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
              Emitido por {associationName || 'Cote AI Proteção Veicular'}
            </div>
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#38BDF8',
              backgroundColor: '#0E2238',
              border: '1px solid #0284C7',
              borderRadius: '999px',
              padding: '5px 12px',
              textTransform: 'uppercase',
            }}
          >
            ✦ ESTIMATIVA IA
          </div>
        </div>

        {/* ── 2x2 Grid of Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Card 1: Roubo / Furto */}
          <div
            style={{
              backgroundColor: '#0C1427',
              border: '1.5px solid #EF4444',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚠️ Roubo / Furto
                </span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#38BDF8', backgroundColor: '#0E2238', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '999px', padding: '2px 8px' }}>
                  ESTIMATIVA IA
                </span>
              </div>
              <p style={{ fontSize: '10.5px', color: '#CBD5E1', lineHeight: '1.45', margin: '0 0 12px 0' }}>
                {data.roubo_furto.justificativa}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>NÍVEL</div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{nivelStr}</div>
              </div>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>RECUPERAÇÃO</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{data.roubo_furto.recuperacao_pct}%</div>
              </div>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>NUNCA RECUP.</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{data.roubo_furto.nunca_recuperados_pct}%</div>
              </div>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>RANKING</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', lineHeight: '1.2' }}>{rankingTxt}</div>
              </div>
            </div>
          </div>

          {/* Card 2: Revenda */}
          <div
            style={{
              backgroundColor: '#0C1427',
              border: '1.5px solid #10B981',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📈 Revenda
                </span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#38BDF8', backgroundColor: '#0E2238', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '999px', padding: '2px 8px' }}>
                  ESTIMATIVA IA
                </span>
              </div>
              <p style={{ fontSize: '10.5px', color: '#CBD5E1', lineHeight: '1.45', margin: '0 0 12px 0' }}>
                {data.revenda.justificativa}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>SCORE</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{scoreStr}</div>
              </div>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>DEMANDA</div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{String(data.revenda.demanda || 'Alta')}</div>
              </div>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>DIAS P/ VENDER</div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{data.revenda.dias_para_vender}</div>
              </div>
              <div style={{ backgroundColor: '#131F38', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>DEPRECIAÇÃO</div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>{data.revenda.depreciacao_anual_pct}%</div>
              </div>
            </div>
          </div>

          {/* Card 3: Colisão · Peças */}
          <div
            style={{
              backgroundColor: '#0C1427',
              border: '1.5px solid #EAB308',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔧 Colisão · Peças
                </span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#38BDF8', backgroundColor: '#0E2238', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '999px', padding: '2px 8px' }}>
                  ESTIMATIVA IA
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.colisao_pecas.slice(0, 8).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span style={{ fontSize: '10.5px', color: '#E2E8F0', fontWeight: 500 }}>
                      {getPecaEmoji(item.peca, item.emoji)} {item.peca}
                    </span>
                    <span style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 800, fontFamily: 'monospace' }}>
                      {formatCurrency(item.valor_estimado)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                marginTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total estimado
              </span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace' }}>
                {formatCurrency(totalColisao)}
              </span>
            </div>
          </div>

          {/* Card 4: Problemas mecânicos */}
          <div
            style={{
              backgroundColor: '#0C1427',
              border: '1.5px solid #0EA5E9',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚙️ Problemas mecânicos
                </span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#38BDF8', backgroundColor: '#0E2238', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '999px', padding: '2px 8px' }}>
                  ESTIMATIVA IA
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.problemas_mecanicos.slice(0, 6).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '5px 0',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '8px', flex: 1 }}>
                      <span style={{ fontSize: '10.5px', color: '#FFFFFF', fontWeight: 700, lineHeight: '1.3' }}>
                        {item.problema}
                      </span>
                      <span style={{ fontSize: '9.5px', color: '#38BDF8', fontWeight: 600, marginTop: '2px' }}>
                        • {getKmFaixa(item)}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 800, fontFamily: 'monospace', flexShrink: 0 }}>
                      {formatCurrency(item.valor_estimado)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {consultor?.nome && (
              <div
                style={{
                  backgroundColor: '#131F38',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  marginTop: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>Seu consultor</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>{consultor.nome}</div>
                </div>
                {consultor.telefone && (
                  <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600 }}>{consultor.telefone}</div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Footer Disclaimer ── */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '12px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '9.5px', color: '#64748B', margin: 0, fontStyle: 'italic', letterSpacing: '0.3px' }}>
          ✦ Estimativas geradas por inteligência artificial baseadas em indicadores de mercado e histórico do setor automotivo brasileiro.
        </p>
      </div>
    </div>
  );
};