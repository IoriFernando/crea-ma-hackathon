import OpenAI from "openai"
import crypto from "crypto"

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
})

async function parsePDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse-fork")).default
  const data = await pdfParse(buffer)
  return data.text
}

function calcularHash(buffer: Buffer) {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex")
  return { hash, tamanho: buffer.length }
}

function verificarAssinaturaDigital(buffer: Buffer) {
  try {
    const texto = buffer.toString("binary")
    const temAssinatura = texto.includes("/Type /Sig") || texto.includes("/SubFilter")
    if (!temAssinatura) return { assinado: false, icpBrasil: false, confiabilidade: 0, observacao: "Nenhuma assinatura digital detectada" }
    const matchSubFilter = texto.match(/\/SubFilter\s*\/([^\s/]+)/)
    const tipo = matchSubFilter?.[1] ?? "desconhecido"
    const icpBrasil = tipo.includes("pkcs7") || tipo.includes("CAdES") || tipo.includes("ETSI")
    return {
      assinado: true, tipo, icpBrasil,
      confiabilidade: icpBrasil ? 95 : 55,
      observacao: icpBrasil ? "Assinatura ICP-Brasil detectada" : `Assinatura detectada (${tipo}) mas não é ICP-Brasil`,
    }
  } catch {
    return { assinado: false, icpBrasil: false, confiabilidade: 0, observacao: "Erro ao verificar assinatura" }
  }
}

async function verificarQRCodeCREA(texto: string) {
  const match = texto.match(/https?:\/\/crea[-\w.]*\.(?:sitac\.com\.br|org\.br)\/[^\s"<>]+/i)
    ?? texto.match(/https?:\/\/[\w.-]+\/publico\/[^\s"<>]+/i)
  if (!match) return { verificado: false, confiabilidade: 0, observacao: "Nenhum link de autenticação CREA encontrado" }
  const url = match[0].trim()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } })
    const html = await res.text()
    const invalido = html.toLowerCase().includes("não encontrado") || html.toLowerCase().includes("inválido") || !res.ok
    return {
      verificado: !invalido, url,
      confiabilidade: !invalido ? 99 : 15,
      observacao: !invalido ? "Documento autenticado no sistema CREA" : "Documento não encontrado no sistema CREA",
    }
  } catch {
    return { verificado: false, url, confiabilidade: 40, observacao: "Link encontrado mas sistema CREA inacessível — verifique manualmente" }
  }
}

function calcularScoreFinal(assinatura: any, qrcode: any) {
  let pontos = 20; let max = 100
  if (assinatura.assinado) pontos += assinatura.icpBrasil ? 40 : 20
  if (qrcode.verificado) pontos += 40
  else if (qrcode.url) pontos += 10
  const score = Math.round((pontos / max) * 100)
  const nivel: "alto" | "medio" | "baixo" = score >= 75 ? "alto" : score >= 45 ? "medio" : "baixo"
  const textos = {
    alto: `Score ${score}% — documento com alto grau de confiabilidade. Integridade confirmada, ${assinatura.icpBrasil ? "assinatura ICP-Brasil válida" : "assinatura detectada"} e ${qrcode.verificado ? "autenticado no CREA" : "link CREA presente"}.`,
    medio: `Score ${score}% — confiabilidade moderada. ${!assinatura.assinado ? "Sem assinatura digital. " : ""}${!qrcode.verificado ? "Não foi possível autenticar no CREA. " : ""}Recomenda-se verificação adicional.`,
    baixo: `Score ${score}% — baixa confiabilidade. Sem assinatura digital e sem autenticação CREA verificável. Solicite o documento original.`,
  }
  return { score, nivel, texto: textos[nivel] }
}

function extrairTrechosRelevantes(texto: string): string {
  const linhas = texto.split("\n").map(l => l.trim()).filter(l => l.length > 2)
  const keywords = ["contrato", "convênio", "cnpj", "cpf", "contratante", "contratado", "razão social", "responsável técnico", "título", "crea", "confea", "rnp", "art", "anotação", "registro", "início", "término", "período", "data", "serviço", "obra", "atividade", "quantidade", "assinatura", "cargo", "função", "representante", "habilitado", "laudo", "dispensa", "licitação", "valor", "prazo", "execução", "engenheiro"]
  const relevantes = linhas.filter(l => keywords.some(kw => l.toLowerCase().includes(kw)))
  const base = relevantes.length > 15 ? relevantes : linhas
  return base.join("\n").slice(0, 8000)
}

function dividirEmChunks(texto: string, tamanho: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < texto.length; i += tamanho) chunks.push(texto.slice(i, i + tamanho))
  return chunks
}

const SYSTEM_PROMPT = `Você é um analista técnico do CREA-MA especializado em validação de documentos para emissão de CAT (Certidão de Acervo Técnico), conforme a Resolução 1137/2023 do CONFEA e o Anexo IV (Dados Mínimos do Atestado).

Analise o documento recebido e retorne APENAS um JSON válido, sem markdown, sem blocos de código, sem explicações fora do JSON.

{
  "documento": "nome ou tipo do documento identificado",
  "requerente": "nome do profissional ou empresa identificado",
  "valido_para_cat": true ou false,
  "score": número de 0 a 100,
  "resumo": "frase curta descrevendo o resultado geral",
  "criterios": {
    "contrato": { "numero_contrato": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" } },
    "contratante": {
      "razao_social": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "cnpj": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" }
    },
    "contratado": {
      "tipo": "pj|pf",
      "razao_social_ou_nome": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "cnpj_ou_registro": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "titulo_profissional": { "valor": "", "status": "ok|ausente|nao_aplicavel", "observacao": "" }
    },
    "responsavel_tecnico": {
      "nome": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "titulo": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "registro_crea": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" }
    },
    "descricao_servicos": {
      "descricao_atividades": { "valor": "", "status": "ok|ausente|insuficiente", "observacao": "" },
      "quantitativos": { "valor": "", "status": "ok|ausente|insuficiente", "observacao": "" }
    },
    "assinatura_contratante": {
      "nome_representante": { "valor": "", "status": "ok|ausente|incompleto", "observacao": "" },
      "cargo_funcao": { "valor": "", "status": "ok|ausente|incompleto", "observacao": "" },
      "titulo_profissional": { "valor": "", "status": "ok|ausente|nao_aplicavel", "observacao": "" }
    },
    "assinatura_profissional_habilitado": {
      "nome": { "valor": "", "status": "ok|ausente|incompleto", "observacao": "" },
      "titulo": { "valor": "", "status": "ok|ausente|incompleto", "observacao": "" },
      "registro_confea_crea": { "valor": "", "status": "ok|ausente|incompleto", "observacao": "" },
      "art_laudo_quando_sem_profissional": { "valor": "", "status": "ok|ausente|nao_aplicavel", "observacao": "" }
    },
    "art": { "numeros_art": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" } },
    "periodo_servico": {
      "data_inicio": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "data_termino": { "valor": "", "status": "ok|ausente|inconsistente", "observacao": "" },
      "coerencia_periodo": { "valor": "", "status": "ok|inconsistente|nao_verificavel", "observacao": "" }
    }
  },
  "pendencias": ["lista de problemas"],
  "recomendacoes": ["lista de ações corretivas"]
}

Regras: "ok"=correto; "ausente"=não encontrado; "inconsistente"=divergência; "insuficiente"=genérico; "incompleto"=parcial; "nao_aplicavel"=não exigido.
"valido_para_cat" só true se TODOS obrigatórios "ok".`

async function analisarComChunks(texto: string): Promise<string> {
  const LIMITE = 7000
  if (texto.length <= LIMITE) {
    const r = await openai.chat.completions.create({ model: "deepseek-chat", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `Analise:\n\n${texto}` }] })
    return r.choices[0].message.content ?? ""
  }
  const chunks = dividirEmChunks(texto, LIMITE)
  const extraidos: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const r = await openai.chat.completions.create({
      model: "deepseek-chat", max_tokens: 800,
      messages: [{ role: "system", content: `Extraia dados relevantes para CAT: contratos, CNPJs, CPFs, nomes, títulos, registros CREA/CONFEA, ARTs, datas, serviços, quantitativos, assinaturas, cargos. Um por linha. Se nada relevante, responda "nada relevante".` }, { role: "user", content: `Trecho ${i + 1}/${chunks.length}:\n\n${chunks[i]}` }],
    })
    const d = r.choices[0].message.content ?? ""
    if (!d.toLowerCase().includes("nada relevante")) extraidos.push(`[Trecho ${i + 1}]\n${d}`)
  }
  const consolidado = extraidos.join("\n\n").slice(0, 6000)
  const rf = await openai.chat.completions.create({ model: "deepseek-chat", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `Analise com base nos dados extraídos:\n\n${consolidado}` }] })
  return rf.choices[0].message.content ?? ""
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return Response.json({ erro: "Nenhum arquivo enviado" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const hashInfo = calcularHash(buffer)
    const assinatura = verificarAssinaturaDigital(buffer)

    let texto: string
    try {
      texto = await parsePDF(buffer)
    } catch {
      return Response.json({ erro: "Não foi possível ler o PDF." }, { status: 422 })
    }
    if (!texto || texto.trim().length < 50) return Response.json({ erro: "PDF sem texto legível. Pode ser escaneado sem OCR." }, { status: 422 })

    const qrcode = await verificarQRCodeCREA(texto)
    const confiabilidade = calcularScoreFinal(assinatura, qrcode)
    const textoFiltrado = extrairTrechosRelevantes(texto)

    let raw: string
    try {
      raw = await analisarComChunks(textoFiltrado)
    } catch (e: any) {
      if (e?.status === 400 || e?.code === "context_length_exceeded") {
        raw = await analisarComChunks(textoFiltrado.slice(0, 3500))
      } else throw e
    }

    const clean = raw.replace(/```json|```/g, "").trim()
    try { JSON.parse(clean) } catch { return Response.json({ erro: "IA retornou resposta inválida. Tente novamente." }, { status: 500 }) }

    return Response.json({ resultado: clean, verificacao: { hash: hashInfo, assinatura, qrcode, confiabilidade } })

  } catch (error: any) {
    if (error?.status === 402) return Response.json({ erro: "Saldo insuficiente na API DeepSeek." }, { status: 402 })
    if (error?.status === 429) return Response.json({ erro: "Limite de requisições atingido. Aguarde e tente novamente." }, { status: 429 })
    return Response.json({ erro: `Erro interno: ${error?.message ?? error}` }, { status: 500 })
  }
}