# Sistema de Conferência de Prestação de Contas

Sistema web para conferência de prestação de contas desenvolvido com React, TypeScript e Vite.

## 🚀 Deploy

Este projeto é automaticamente implantado no GitHub Pages através do GitHub Actions.

### URL de Produção
https://douglasreis88-crypto.github.io/start-coding-buddy/

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **Routing**: TanStack Router
- **Backend**: Supabase
- **Deploy**: GitHub Pages + GitHub Actions

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build local
- `npm run lint` - Executa o linter

## 🚀 Como funciona o deploy

1. **Push para main**: Todo push para a branch `main` dispara o workflow do GitHub Actions
2. **Build automático**: O GitHub Actions instala dependências e executa `npm run build`
3. **Deploy**: Os arquivos são publicados no GitHub Pages

## 🔧 Configuração do GitHub Pages
<!-- fix build -->

O projeto está configurado para usar GitHub Pages com:
- **Source**: GitHub Actions
- **Branch**: gh-pages (criada automaticamente)
- **Path**: / (root)

## 📝 Notas

- O arquivo `vite.config.ts` está configurado com `base: '/start-coding-buddy/'` para produção
- O arquivo `.nojekyll` permite que arquivos começando com `_` sejam servidos
- O workflow do GitHub Actions está em `.github/workflows/deploy.yml`
