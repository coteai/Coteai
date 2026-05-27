import { supabase } from '../lib/supabase';

export const seedDemoData = async (associationId: string) => {
  try {
    await supabase.from('pricing_table').delete().eq('association_id', associationId);
    await supabase.from('vehicle_categories').delete().eq('association_id', associationId);
    await supabase.from('plans').delete().eq('association_id', associationId);
    await supabase.from('vehicle_groups').delete().eq('association_id', associationId);

    const groups = [
      { association_id: associationId, base_type: 'carro', nome: 'Automóveis (Passeio/SUV)', pricing_mode: 'plans', ordem: 1 },
      { association_id: associationId, base_type: 'moto', nome: 'Motocicletas', pricing_mode: 'plans', ordem: 2 },
      { association_id: associationId, base_type: 'caminhao', nome: 'Caminhões e Pesados', pricing_mode: 'plans', ordem: 3 },
    ];

    const { data: insertedGroups, error: groupError } = await supabase.from('vehicle_groups').insert(groups).select();
    if (groupError) throw new Error(`Erro ao criar grupos: ${groupError.message}`);

    const groupCarro = insertedGroups.find((g: any) => g.base_type === 'carro');
    const groupMoto = insertedGroups.find((g: any) => g.base_type === 'moto');
    const groupCaminhao = insertedGroups.find((g: any) => g.base_type === 'caminhao');

    if (!groupCarro || !groupMoto || !groupCaminhao) throw new Error('Falha ao localizar IDs dos grupos inseridos');

    const covsPrata = [
      { key: 'roubo', label: 'Roubo' },
      { key: 'furto', label: 'Furto' },
      { key: 'colisao', label: 'Colisão' },
      { key: 'incendio', label: 'Incêndio' },
      { key: 'perca_total', label: 'Perda Total' },
      { key: 'reboque_panes', label: 'Reboque / Panes', param: '200KM' },
      { key: 'terceiros', label: 'Terceiros', param: 'R$ 30.000,00' }
    ];
    const covsOuro = [
      ...covsPrata,
      { key: 'fenomeno_natural', label: 'Fenômeno da Natureza' },
      { key: 'reboque_acidente', label: 'Reboque / Acidentes', param: '500KM' },
      { key: 'carro_reserva', label: 'Carro Reserva', param: '7 Dias' },
      { key: 'retorno_domicilio', label: 'Retorno a Domicílio', param: 'Até 50KM' },
      { key: 'vidros_farois', label: 'Vidros e Faróis', param: '50% (1x ao ano)' }
    ];
    const covsDiamante = [
      ...covsOuro.filter(c => c.key !== 'reboque_acidente' && c.key !== 'carro_reserva'),
      { key: 'reboque_acidente', label: 'Reboque / Acidentes', param: '1000KM' },
      { key: 'carro_reserva', label: 'Carro Reserva', param: '15 Dias' },
      { key: 'chaveiro_hospedagem', label: 'Chaveiro e Hospedagem', param: 'R$ 200,00' },
      { key: 'pequenos_reparos', label: 'Pequenos Reparos', param: 'Franquia R$ 150' }
    ];

    const covsMotoStd = [
      { key: 'roubo', label: 'Roubo' },
      { key: 'furto', label: 'Furto' },
      { key: 'colisao', label: 'Colisão' },
      { key: 'incendio', label: 'Incêndio' },
      { key: 'acidente', label: 'Acidente' },
      { key: 'guincho_24h', label: 'Guincho 24h', param: '200KM' },
      { key: 'capacete', label: 'Indenização de Capacete' }
    ];
    const covsMotoPrem = [
      ...covsMotoStd.filter(c => c.key !== 'guincho_24h'),
      { key: 'perca_total', label: 'Perda Total' },
      { key: 'fenomeno_natural', label: 'Fenômeno da Natureza' },
      { key: 'guincho_24h', label: 'Guincho 24h', param: '500KM' },
      { key: 'terceiros', label: 'Terceiros', param: 'R$ 20.000,00' }
    ];

    const covsCamBasico = [
      { key: 'roubo', label: 'Roubo' },
      { key: 'furto', label: 'Furto' },
      { key: 'colisao', label: 'Colisão' },
      { key: 'guincho_24h', label: 'Guincho 24h', param: '500KM' },
      { key: 'protecao_carga', label: 'Proteção de Carga' }
    ];
    const covsCamTotal = [
      ...covsCamBasico,
      { key: 'incendio', label: 'Incêndio' },
      { key: 'fenomeno_natural', label: 'Fenômeno da Natureza' },
      { key: 'perca_total', label: 'Perda Total' },
      { key: 'terceiros', label: 'Terceiros', param: 'R$ 100.000,00' },
      { key: 'vidros_farois', label: 'Vidros e Faróis', param: '70% (1x ao ano)' }
    ];

    const plans = [
      { association_id: associationId, group_id: groupCarro.id, tipo_veiculo: 'carro', nome: 'Prata', descricao: 'Essencial e econômico', ativo: true, franquia_percentual: 5, coberturas: covsPrata },
      { association_id: associationId, group_id: groupCarro.id, tipo_veiculo: 'carro', nome: 'Ouro', descricao: 'Mais escolhido', ativo: true, franquia_percentual: 4, coberturas: covsOuro },
      { association_id: associationId, group_id: groupCarro.id, tipo_veiculo: 'carro', nome: 'Diamante', descricao: 'Máxima proteção', ativo: true, franquia_percentual: 3, coberturas: covsDiamante },
      { association_id: associationId, group_id: groupMoto.id, tipo_veiculo: 'moto', nome: 'Moto Standard', descricao: 'Proteção básica', ativo: true, franquia_percentual: 6, coberturas: covsMotoStd },
      { association_id: associationId, group_id: groupMoto.id, tipo_veiculo: 'moto', nome: 'Moto Premium', descricao: 'Tranquilidade total', ativo: true, franquia_percentual: 4, coberturas: covsMotoPrem },
      { association_id: associationId, group_id: groupCaminhao.id, tipo_veiculo: 'caminhao', nome: 'Caminhão Básico', descricao: 'O essencial para a estrada', ativo: true, franquia_percentual: 8, coberturas: covsCamBasico },
      { association_id: associationId, group_id: groupCaminhao.id, tipo_veiculo: 'caminhao', nome: 'Caminhão Total', descricao: 'Segurança completa', ativo: true, franquia_percentual: 5, coberturas: covsCamTotal },
    ];

    const { data: insertedPlans, error: plansError } = await supabase.from('plans').insert(plans).select();
    if (plansError) throw new Error(`Erro ao criar planos: ${plansError.message}`);

    const planPrata = insertedPlans.find((p: any) => p.nome === 'Prata');
    const planOuro = insertedPlans.find((p: any) => p.nome === 'Ouro');
    const planDiamante = insertedPlans.find((p: any) => p.nome === 'Diamante');
    const planMotoStd = insertedPlans.find((p: any) => p.nome === 'Moto Standard');
    const planMotoPrem = insertedPlans.find((p: any) => p.nome === 'Moto Premium');
    const planCamBasico = insertedPlans.find((p: any) => p.nome === 'Caminhão Básico');
    const planCamTotal = insertedPlans.find((p: any) => p.nome === 'Caminhão Total');

    const categories = [
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 0, fipe_max: 30000, nome: 'Até R$ 30.000', tipo_veiculo: 'carro' },
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 30001, fipe_max: 50000, nome: 'R$ 30.001 a R$ 50.000', tipo_veiculo: 'carro' },
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 50001, fipe_max: 80000, nome: 'R$ 50.001 a R$ 80.000', tipo_veiculo: 'carro' },
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 80001, fipe_max: 120000, nome: 'R$ 80.001 a R$ 120.000', tipo_veiculo: 'carro' },
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 120001, fipe_max: 200000, nome: 'R$ 120.001 a R$ 200.000', tipo_veiculo: 'carro' },
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 200001, fipe_max: 500000, nome: 'R$ 200.001 a R$ 500.000', tipo_veiculo: 'carro' },
      { association_id: associationId, group_id: groupCarro.id, fipe_min: 500001, fipe_max: 99999999, nome: 'Acima de R$ 500.000', tipo_veiculo: 'carro' },
      
      { association_id: associationId, group_id: groupMoto.id, fipe_min: 0, fipe_max: 10000, nome: 'Até R$ 10.000', tipo_veiculo: 'moto' },
      { association_id: associationId, group_id: groupMoto.id, fipe_min: 10001, fipe_max: 25000, nome: 'R$ 10.001 a R$ 25.000', tipo_veiculo: 'moto' },
      { association_id: associationId, group_id: groupMoto.id, fipe_min: 25001, fipe_max: 50000, nome: 'R$ 25.001 a R$ 50.000', tipo_veiculo: 'moto' },
      { association_id: associationId, group_id: groupMoto.id, fipe_min: 50001, fipe_max: 100000, nome: 'R$ 50.001 a R$ 100.000', tipo_veiculo: 'moto' },
      { association_id: associationId, group_id: groupMoto.id, fipe_min: 100001, fipe_max: 99999999, nome: 'Acima de R$ 100.000', tipo_veiculo: 'moto' },

      { association_id: associationId, group_id: groupCaminhao.id, fipe_min: 0, fipe_max: 100000, nome: 'Até R$ 100.000', tipo_veiculo: 'caminhao' },
      { association_id: associationId, group_id: groupCaminhao.id, fipe_min: 100001, fipe_max: 250000, nome: 'R$ 100.001 a R$ 250.000', tipo_veiculo: 'caminhao' },
      { association_id: associationId, group_id: groupCaminhao.id, fipe_min: 250001, fipe_max: 500000, nome: 'R$ 250.001 a R$ 500.000', tipo_veiculo: 'caminhao' },
      { association_id: associationId, group_id: groupCaminhao.id, fipe_min: 500001, fipe_max: 1000000, nome: 'R$ 500.001 a R$ 1.000.000', tipo_veiculo: 'caminhao' },
      { association_id: associationId, group_id: groupCaminhao.id, fipe_min: 1000001, fipe_max: 99999999, nome: 'Acima de R$ 1.000.000', tipo_veiculo: 'caminhao' },
    ];

    const { data: insertedCategories, error: catError } = await supabase.from('vehicle_categories').insert(categories).select();
    if (catError) throw new Error(`Erro ao criar faixas FIPE: ${catError.message}`);

    const pricingItems: any[] = [];

    const addPrices = (fipeMin: number, pricesMatrix: Record<string, number>) => {
      const cat = insertedCategories.find((c: any) => c.fipe_min === fipeMin);
      if (cat) {
        Object.entries(pricesMatrix).forEach(([planName, mensalidade]) => {
          let planData;
          if (planName === 'Prata') planData = planPrata;
          if (planName === 'Ouro') planData = planOuro;
          if (planName === 'Diamante') planData = planDiamante;
          if (planName === 'Moto Standard') planData = planMotoStd;
          if (planName === 'Moto Premium') planData = planMotoPrem;
          if (planName === 'Caminhão Básico') planData = planCamBasico;
          if (planName === 'Caminhão Total') planData = planCamTotal;

          if (planData) {
            pricingItems.push({
              association_id: associationId,
              category_id: cat.id,
              plan_id: planData.id,
              mensalidade,
              franquia_percentual: planData.franquia_percentual,
              cobertura_maxima: cat.fipe_max,
              ativo: true
            });
          }
        });
      }
    };

    addPrices(0, { 'Prata': 89, 'Ouro': 129, 'Diamante': 179 });
    addPrices(30001, { 'Prata': 119, 'Ouro': 159, 'Diamante': 229 });
    addPrices(50001, { 'Prata': 159, 'Ouro': 209, 'Diamante': 289 });
    addPrices(80001, { 'Prata': 219, 'Ouro': 279, 'Diamante': 369 });
    addPrices(120001, { 'Prata': 299, 'Ouro': 389, 'Diamante': 499 });
    addPrices(200001, { 'Prata': 459, 'Ouro': 589, 'Diamante': 749 });
    addPrices(500001, { 'Prata': 799, 'Ouro': 999, 'Diamante': 1299 });

    addPrices(0, { 'Moto Standard': 69, 'Moto Premium': 99 });
    addPrices(10001, { 'Moto Standard': 99, 'Moto Premium': 139 });
    addPrices(25001, { 'Moto Standard': 149, 'Moto Premium': 209 });
    addPrices(50001, { 'Moto Standard': 229, 'Moto Premium': 319 });
    addPrices(100001, { 'Moto Standard': 349, 'Moto Premium': 499 });

    addPrices(0, { 'Caminhão Básico': 350, 'Caminhão Total': 500 });
    addPrices(100001, { 'Caminhão Básico': 550, 'Caminhão Total': 750 });
    addPrices(250001, { 'Caminhão Básico': 850, 'Caminhão Total': 1150 });
    addPrices(500001, { 'Caminhão Básico': 1300, 'Caminhão Total': 1800 });
    addPrices(1000001, { 'Caminhão Básico': 2000, 'Caminhão Total': 2800 });

    const { error: pricingError } = await supabase.from('pricing_table').insert(pricingItems);
    if (pricingError) throw new Error(`Erro ao criar matriz de preços: ${pricingError.message}`);

    return { success: true };

  } catch (err: any) {
    console.error("Erro no Seed Data:", err);
    return { success: false, error: err.message };
  }
};
