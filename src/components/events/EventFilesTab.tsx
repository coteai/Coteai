import React, { useState } from 'react';
import { Upload, Download, FileText, Image as ImageIcon } from 'lucide-react';
import type { EventoArquivo } from '../../types/events';

interface Props {
  arquivos: EventoArquivo[];
  accentHex: string;
  readOnly?: boolean;
  onUpload: (arquivo: { nome: string; tipo: EventoArquivo['tipo'] }) => Promise<void>;
}

export const EventFilesTab: React.FC<Props> = ({
  arquivos,
  accentHex,
  readOnly,
  onUpload,
}) => {
  const [novoArquivo, setNovoArquivo] = useState({
    nome: '',
    tipo: 'foto' as EventoArquivo['tipo'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoArquivo.nome) return;
    await onUpload(novoArquivo);
    setNovoArquivo({ nome: '', tipo: 'foto' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Anexos, Vistorias & Laudos ({arquivos.length})
        </h4>
      </div>

      {!readOnly && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            required
            placeholder="Nome do arquivo (ex: foto_lateral.jpg, nf_pecas.pdf)"
            value={novoArquivo.nome}
            onChange={(e) => setNovoArquivo({ ...novoArquivo, nome: e.target.value })}
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          />
          <select
            value={novoArquivo.tipo}
            onChange={(e) => setNovoArquivo({ ...novoArquivo, tipo: e.target.value as any })}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="foto">Foto</option>
            <option value="laudo">Laudo</option>
            <option value="documento">Documento</option>
            <option value="nota_fiscal">Nota Fiscal</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-1.5 shadow-md"
            style={{ backgroundColor: accentHex }}
          >
            <Upload size={14} />
            <span>Anexar</span>
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {arquivos.map((arq) => (
          <div
            key={arq.id}
            className="p-4 rounded-2xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.03] transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-white/5 w-fit text-blue-400">
                {arq.tipo === 'foto' ? <ImageIcon size={20} /> : <FileText size={20} />}
              </div>
              <p className="text-xs font-bold text-white truncate" title={arq.nome}>
                {arq.nome}
              </p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{arq.tipo}</p>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[10px] text-zinc-500">
              <span>{new Date(arq.criado_em).toLocaleDateString('pt-BR')}</span>
              <button
                type="button"
                onClick={() => alert(`Simulação de download do arquivo: ${arq.nome}`)}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1"
              >
                <Download size={12} />
                <span>Baixar</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
