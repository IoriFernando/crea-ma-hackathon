"use client"

import { useState } from "react"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">

      {/* 🔷 LOGOS */}
      <div className="flex items-center gap-6 mb-6">
        <img src="/logo.png" alt="Orgão 1" className="h-48" />
      </div>

      {/* 🔷 CARD PRINCIPAL */}
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-xl text-center">

        {/* TÍTULO */}
        <h1 className="text-2xl font-bold mb-2">
          Analisador de Documentos
        </h1>

        {/* DESCRIÇÃO */}
        <p className="text-gray-600 mb-6">
          Envie o arquivo em PDF para validar automaticamente as informações
          conforme os critérios definidos pelo sistema.
        </p>

        {/* 📂 UPLOAD */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-500 transition">

          <span className="text-gray-500 mb-2">
            Clique ou arraste um PDF aqui
          </span>

          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {file && (
            <span className="text-sm text-green-600 mt-2">
              📄 {file.name}
            </span>
          )}
        </label>

        {/* 🚀 BOTÃO */}
        <button
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Analisar Documento
        </button>

      </div>

      {/* 🔻 RODAPÉ */}
      <p className="text-xs text-gray-400 mt-6">
        Sistema de validação automatizada • MVP
      </p>

    </main>
  )
}