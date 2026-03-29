"use client"

import { useState } from "react"

interface CampoValidado {
  valor: string
  status: "ok" | "ausente" | "inconsistente" | "insuficiente" | "incompleto" | "nao_aplicavel"
  observacao: string
}

interface Analise {
  documento: string
  requerente: string
  valido_para_cat: boolean
  score: number
  resumo: string
  criterios: {
    contrato: { numero_contrato: CampoValidado }
    contratante: { razao_social: CampoValidado; cnpj: CampoValidado }
    contratado: { tipo: string; razao_social_ou_nome: CampoValidado; cnpj_ou_registro: CampoValidado; titulo_profissional: CampoValidado }
    responsavel_tecnico: { nome: CampoValidado; titulo: CampoValidado; registro_crea: CampoValidado }
    descricao_servicos: { descricao_atividades: CampoValidado; quantitativos: CampoValidado }
    assinatura_contratante: { nome_representante: CampoValidado; cargo_funcao: CampoValidado; titulo_profissional: CampoValidado }
    assinatura_profissional_habilitado: { nome: CampoValidado; titulo: CampoValidado; registro_confea_crea: CampoValidado; art_laudo_quando_sem_profissional: CampoValidado }
    art: { numeros_art: CampoValidado }
    periodo_servico: { data_inicio: CampoValidado; data_termino: CampoValidado; coerencia_periodo: CampoValidado }
  }
  pendencias: string[]
  recomendacoes: string[]
}

interface Verificacao {
  hash: { hash: string; tamanho: number }
  assinatura: { assinado: boolean; icpBrasil?: boolean; tipo?: string; confiabilidade: number; observacao: string }
  qrcode: { verificado: boolean; url?: string; confiabilidade: number; observacao: string }
  confiabilidade: { score: number; nivel: "alto" | "medio" | "baixo"; texto: string }
}

const STATUS_CONFIG = {
  ok:            { label: "ok",            bg: "#EAF3DE", border: "#97C459", text: "#27500A", dot: "#3B6D11" },
  ausente:       { label: "ausente",       bg: "#FCEBEB", border: "#F09595", text: "#791F1F", dot: "#A32D2D" },
  inconsistente: { label: "inconsistente", bg: "#FCEBEB", border: "#F09595", text: "#791F1F", dot: "#A32D2D" },
  insuficiente:  { label: "insuficiente",  bg: "#FAEEDA", border: "#EF9F27", text: "#633806", dot: "#854F0B" },
  incompleto:    { label: "incompleto",    bg: "#FAEEDA", border: "#EF9F27", text: "#633806", dot: "#854F0B" },
  nao_aplicavel: { label: "n/a",           bg: "#F1EFE8", border: "#B4B2A9", text: "#5F5E5A", dot: "#888780" },
}

function Campo({ label, campo }: { label: string; campo: CampoValidado }) {
  const cfg = STATUS_CONFIG[campo.status] ?? STATUS_CONFIG.nao_aplicavel
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 8, border: `1px solid ${cfg.border}`, background: cfg.bg, marginBottom: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0, marginTop: 5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: cfg.text }}>{label}</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: cfg.dot, color: cfg.bg, flexShrink: 0 }}>{cfg.label}</span>
        </div>
        {campo.valor && <div style={{ fontSize: 12, color: cfg.text, marginTop: 2, opacity: 0.85 }}>{campo.valor}</div>}
        {campo.observacao && <div style={{ fontSize: 11, color: cfg.text, marginTop: 3, opacity: 0.7, fontStyle: "italic" }}>{campo.observacao}</div>}
      </div>
    </div>
  )
}

function Secao({ titulo, numero, children }: { titulo: string; numero: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#185FA5", color: "#fff", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{numero}</div>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.05em" }}>{titulo}</span>
      </div>
      {children}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#3B6D11" : score >= 50 ? "#854F0B" : "#A32D2D"
  return (
    <div style={{ background: "#F1EFE8", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  )
}

function PainelConfiabilidade({ v }: { v: Verificacao }) {
  const { score, nivel, texto } = v.confiabilidade
  const corBarra = nivel === "alto" ? "#3B6D11" : nivel === "medio" ? "#854F0B" : "#A32D2D"
  const corFundo = nivel === "alto" ? "#EAF3DE" : nivel === "medio" ? "#FAEEDA" : "#FCEBEB"
  const corBorda = nivel === "alto" ? "#97C459" : nivel === "medio" ? "#EF9F27" : "#F09595"
  const corTexto = nivel === "alto" ? "#27500A" : nivel === "medio" ? "#633806" : "#791F1F"
  const labelNivel = nivel === "alto" ? "Alto" : nivel === "medio" ? "Médio" : "Baixo"

  const itens = [
    { label: "Integridade do arquivo", ok: true, detalhe: `SHA-256 · ${(v.hash.tamanho / 1024).toFixed(1)} KB` },
    { label: "Assinatura digital", ok: v.assinatura.assinado, detalhe: v.assinatura.icpBrasil ? "ICP-Brasil detectada" : v.assinatura.observacao },
    { label: "Autenticação CREA", ok: v.qrcode.verificado, detalhe: v.qrcode.observacao },
  ]

  return (
    <div style={{ background: "#fff", border: `1px solid ${corBorda}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confiabilidade</span>
        <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 99, background: corFundo, color: corTexto }}>{labelNivel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, background: "#F1EFE8", borderRadius: 99, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${score}%`, height: "100%", background: corBarra, borderRadius: 99, transition: "width 0.8s ease" }} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 500, color: corBarra, minWidth: 44, textAlign: "right" }}>{score}%</span>
      </div>
      <p style={{ fontSize: 12, color: corTexto, background: corFundo, borderRadius: 8, padding: "8px 10px", margin: "0 0 12px" }}>{texto}</p>
      {itens.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: i < itens.length - 1 ? "0.5px solid #F1EFE8" : "none" }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1, background: item.ok ? "#3B6D11" : "#A32D2D", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>{item.ok ? "✓" : "✕"}</span>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{item.label}</div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 1 }}>{item.detalhe}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 10, padding: "6px 8px", background: "#F1EFE8", borderRadius: 6 }}>
        <div style={{ fontSize: 10, color: "#888780", marginBottom: 2 }}>SHA-256</div>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#5F5E5A", wordBreak: "break-all" }}>{v.hash.hash.slice(0, 32)}…</div>
      </div>
    </div>
  )
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null)
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) { setErro("Selecione um arquivo PDF."); return }
    setLoading(true); setErro(""); setAnalise(null); setVerificacao(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/analisar", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) { setErro(json.erro || "Erro na API"); return }
      if (json.verificacao) setVerificacao(json.verificacao)
      const clean = json.resultado.replace(/```json|```/g, "").trim()
      setAnalise(JSON.parse(clean))
    } catch {
      setErro("Erro ao processar resposta da API.")
    } finally {
      setLoading(false)
    }
  }

  const c = analise?.criterios

  return (
    <div style={{ minHeight: "100vh", background: "#F1EFE8", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid #D3D1C7", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <img src="/logo.png" alt="CREA-MA" style={{ height: 44, objectFit: "contain" }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#2C2C2A" }}>Validador de Documentos — CAT</div>
          <div style={{ fontSize: 12, color: "#888780" }}>Resolução 1137/2023 · CONFEA · CREA-MA</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Coluna central */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Upload */}
          <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A", marginBottom: 4 }}>Documento para análise</div>
            <div style={{ fontSize: 12, color: "#888780", marginBottom: 16 }}>Envie o atestado, ART ou documento de solicitação de CAT em PDF</div>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", border: "1.5px dashed #B4B2A9", borderRadius: 10, padding: "20px", cursor: "pointer", marginBottom: 14 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="1.5" style={{ marginBottom: 8 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span style={{ fontSize: 13, color: "#5F5E5A" }}>Clique ou arraste um PDF aqui</span>
              <input type="file" accept="application/pdf" style={{ display: "none" }}
                onChange={e => { setFile(e.target.files?.[0] || null); setAnalise(null); setVerificacao(null); setErro("") }} />
              {file && <span style={{ fontSize: 12, color: "#3B6D11", marginTop: 8, fontWeight: 500 }}>{file.name}</span>}
            </label>
            <button onClick={handleUpload} disabled={loading || !file} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 500, cursor: loading || !file ? "not-allowed" : "pointer", background: loading || !file ? "#D3D1C7" : "#185FA5", color: loading || !file ? "#888780" : "#fff" }}>
              {loading ? "Analisando documento..." : "Analisar documento"}
            </button>
            {erro && <div style={{ marginTop: 12, padding: "10px 14px", background: "#FCEBEB", border: "1px solid #F09595", borderRadius: 8, fontSize: 13, color: "#791F1F" }}>{erro}</div>}
          </div>

          {/* Resultado IA */}
          {analise && c && (
            <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 20 }}>

              {/* Cabeçalho */}
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid #D3D1C7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: "#2C2C2A" }}>{analise.requerente || "Requerente não identificado"}</div>
                    <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>{analise.documento}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 99, flexShrink: 0, background: analise.valido_para_cat ? "#EAF3DE" : "#FCEBEB", color: analise.valido_para_cat ? "#27500A" : "#791F1F", border: `1px solid ${analise.valido_para_cat ? "#97C459" : "#F09595"}` }}>
                    {analise.valido_para_cat ? "Apto para emitir CAT" : "Pendências encontradas"}
                  </span>
                </div>
                <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#5F5E5A" }}>Conformidade dos dados</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: analise.score >= 80 ? "#3B6D11" : analise.score >= 50 ? "#854F0B" : "#A32D2D" }}>{analise.score}%</span>
                </div>
                <ScoreBar score={analise.score} />
                <div style={{ fontSize: 12, color: "#888780", marginTop: 8, fontStyle: "italic" }}>{analise.resumo}</div>
              </div>

              <Secao titulo="Número do contrato / convênio" numero={1}>
                <Campo label="Número do contrato" campo={c.contrato.numero_contrato} />
              </Secao>
              <Secao titulo="Contratante" numero={2}>
                <Campo label="Razão social" campo={c.contratante.razao_social} />
                <Campo label="CNPJ" campo={c.contratante.cnpj} />
              </Secao>
              <Secao titulo={`Contratado (${c.contratado.tipo === "pj" ? "Pessoa Jurídica" : "Pessoa Física"})`} numero={3}>
                <Campo label={c.contratado.tipo === "pj" ? "Razão social" : "Nome completo"} campo={c.contratado.razao_social_ou_nome} />
                <Campo label={c.contratado.tipo === "pj" ? "CNPJ" : "Registro CONFEA/CREA"} campo={c.contratado.cnpj_ou_registro} />
                {c.contratado.tipo === "pf" && <Campo label="Título profissional" campo={c.contratado.titulo_profissional} />}
              </Secao>
              <Secao titulo="Responsável técnico" numero={4}>
                <Campo label="Nome completo" campo={c.responsavel_tecnico.nome} />
                <Campo label="Título profissional" campo={c.responsavel_tecnico.titulo} />
                <Campo label="Registro CREA-MA" campo={c.responsavel_tecnico.registro_crea} />
              </Secao>
              <Secao titulo="Descrição dos serviços" numero={5}>
                <Campo label="Caracterização das atividades" campo={c.descricao_servicos.descricao_atividades} />
                <Campo label="Quantitativos" campo={c.descricao_servicos.quantitativos} />
              </Secao>
              <Secao titulo="Assinatura do representante do contratante" numero={6}>
                <Campo label="Nome completo" campo={c.assinatura_contratante.nome_representante} />
                <Campo label="Cargo / função" campo={c.assinatura_contratante.cargo_funcao} />
                <Campo label="Título profissional (se houver)" campo={c.assinatura_contratante.titulo_profissional} />
              </Secao>
              <Secao titulo="Assinatura do profissional habilitado" numero={7}>
                <Campo label="Nome completo" campo={c.assinatura_profissional_habilitado.nome} />
                <Campo label="Título profissional" campo={c.assinatura_profissional_habilitado.titulo} />
                <Campo label="Registro CONFEA/CREA" campo={c.assinatura_profissional_habilitado.registro_confea_crea} />
                <Campo label="ART / laudo (quando sem profissional habilitado)" campo={c.assinatura_profissional_habilitado.art_laudo_quando_sem_profissional} />
              </Secao>
              <Secao titulo="Número(s) da(s) ART(s)" numero={8}>
                <Campo label="ART(s) vinculada(s) ao contrato" campo={c.art.numeros_art} />
              </Secao>
              <Secao titulo="Período do serviço" numero={9}>
                <Campo label="Data de início" campo={c.periodo_servico.data_inicio} />
                <Campo label="Data de término" campo={c.periodo_servico.data_termino} />
                <Campo label="Coerência do período" campo={c.periodo_servico.coerencia_periodo} />
              </Secao>
            </div>
          )}
        </div>

        {/* Coluna direita */}
        {(analise || verificacao) && (
          <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Painel de confiabilidade */}
            {verificacao && <PainelConfiabilidade v={verificacao} />}

            {/* Score conformidade */}
            {analise && (
              <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Conformidade dos dados</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Score", val: `${analise.score}%`, color: analise.score >= 80 ? "#3B6D11" : analise.score >= 50 ? "#854F0B" : "#A32D2D" },
                    { label: "Pendências", val: String(analise.pendencias.length), color: analise.pendencias.length === 0 ? "#3B6D11" : "#A32D2D" },
                  ].map(m => (
                    <div key={m.label} style={{ background: "#F1EFE8", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#888780", marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 500, color: m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pendências */}
            {analise && analise.pendencias.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Pendências</div>
                {analise.pendencias.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "0.5px solid #F1EFE8", fontSize: 12, color: "#2C2C2A" }}>
                    <span style={{ color: "#888780", flexShrink: 0 }}>{i + 1}.</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recomendações */}
            {analise && analise.recomendacoes.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Ações recomendadas</div>
                {analise.recomendacoes.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "0.5px solid #F1EFE8", fontSize: 12, color: "#2C2C2A" }}>
                    <span style={{ color: "#185FA5", flexShrink: 0 }}>→</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ações */}
            <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Ações do analista</div>
              {["Notificar requerente", "Solicitar documentação complementar", "Encaminhar à câmara especializada"].map(a => (
                <button key={a} style={{ width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #B4B2A9", background: "transparent", fontSize: 13, color: "#2C2C2A", cursor: "pointer", marginBottom: 6, display: "block" }}>{a}</button>
              ))}
              <button style={{ width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "1px solid #F09595", background: "#FCEBEB", fontSize: 13, color: "#791F1F", cursor: "pointer", display: "block" }}>Indeferir solicitação</button>
            </div>

            {/* Base normativa */}
            <div style={{ background: "#fff", border: "0.5px solid #D3D1C7", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Base normativa</div>
              {["Resolução 1137/2023 — CONFEA", "Anexo IV — Dados mínimos do atestado", "Art. 59 — Dados técnicos", "Art. 60 — Registro de atestado"].map(n => (
                <div key={n} style={{ fontSize: 12, color: "#5F5E5A", padding: "3px 0" }}>· {n}</div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}