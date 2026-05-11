import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { association_id, valor_fipe, veiculo } = await req.json();

    if (!association_id || valor_fipe === undefined) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'association_id' e 'valor_fipe' são obrigatórios." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Inicializa o Supabase Client
    // O Supabase injeta automaticamente SUPABASE_URL e SUPABASE_ANON_KEY em Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Encontra a qual categoria o veículo pertence dado o valor FIPE
    const { data: categorias, error: catError } = await supabase
      .from('vehicle_categories')
      .select('id, nome')
      .eq('association_id', association_id)
      .lte('fipe_min', valor_fipe)
      .gte('fipe_max', valor_fipe);

    if (catError) throw catError;

    if (!categorias || categorias.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma categoria de veículo encontrada para este valor FIPE na sua associação." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Como os ranges não devem conflitar, pegamos a primeira categoria que der match
    const categoria = categorias[0];

    // 2. Busca os preços ativos para aquela categoria, TAZENDO TAMBÉM AS INFOS DO PLANO
    // Nota: Estamos usando o recurso de relacionamento (join) nativo do Supabase PostgREST
    const { data: precificacoes, error: priceError } = await supabase
      .from('pricing_table')
      .select(`
        mensalidade,
        franquia_percentual,
        cobertura_maxima,
        ativo,
        plans(nome, coberturas)
      `)
      .eq('category_id', categoria.id)
      .eq('association_id', association_id)
      .eq('ativo', true);

    if (priceError) throw priceError;

    // 3. Monta e formata as cotações
    const cotacoes = precificacoes.map((item: any) => ({
      plano: item.plans?.nome,
      mensalidade: item.mensalidade,
      franquia: `${item.franquia_percentual}%`,
      cobertura_maxima: item.cobertura_maxima,
      coberturas: item.plans?.coberturas || []
    }));

    // Retorno final formatado conforme exigido no prompt
    const resultado = {
      veiculo: veiculo || "Veículo não especificado",
      fipe: valor_fipe,
      categoria: categoria.nome,
      cotacoes: cotacoes
    };

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
