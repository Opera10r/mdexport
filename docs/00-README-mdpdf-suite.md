# Raven's Gate MD→PDF Dev Tools Suite
## 5 Tools × 3 Formats = 15 Products | $5/month Each | GitHub + Cloudflare

---

## The Suite

| # | Tool | Name | Angle |
|---|---|---|---|
| 1 | README → PDF | **ReadmePDF** | Beautiful README exports |
| 2 | Pandoc-Killer | **MarkPDF** | General MD→PDF without config hell |
| 3 | CHANGELOG → Release Notes | **ReleaseDoc** | Stakeholder-ready release docs |
| 4 | Multi-MD Bundler | **DocBundle** | Many files → one structured PDF |
| 5 | Portfolio README → Resume | **PortfolioPDF** | Dev portfolio as leave-behind |

## Three Formats Per Tool

| Format | Distribution | Auth | Stack |
|---|---|---|---|
| Web App | Cloudflare Pages | Cookie session | HTML + Worker + KV + Stripe |
| CLI Tool | npm registry | License key | Node.js + commander.js |
| GitHub Action | GitHub Marketplace | License key as Secret | JavaScript Action + ncc |

---

## Brief Files

| File | Contents |
|---|---|
| `tool1-web-readme-to-pdf.md` | ReadmePDF — Web App (full brief) |
| `tool1-cli-readme-to-pdf.md` | ReadmePDF — CLI Tool (full brief) |
| `tool1-action-readme-to-pdf.md` | ReadmePDF — GitHub Action (full brief) |
| `tools2-5-all-formats.md` | All remaining tools, all formats |

---

## Shared Stack (All Products)

```
PDF Engine:     Cloudflare Browser Rendering (~$0.002/export)
Hosting:        Cloudflare Pages (free)
Backend:        Cloudflare Workers (free tier)
Auth/State:     Cloudflare KV (free tier)
Payments:       Stripe ($5/month subscriptions)
CLI Bundler:    @vercel/ncc
CLI Framework:  commander.js + chalk + ora
Action Runtime: Node.js 20
AI (Tools 3,5): Anthropic Claude API
```

---

## Build Order

1. **ReadmePDF Web** — establishes the entire shared pattern
2. **ReadmePDF CLI** — adds license key auth to the Worker
3. **ReadmePDF Action** — establishes GitHub Action pattern
4. **MarkPDF Web** — adds math (KaTeX) + diagram (Mermaid) rendering
5. **DocBundle Web** — adds multi-file assembly pipeline
6. **ReleaseDoc Web** — adds CHANGELOG parsing + Claude rewriting
7. **PortfolioPDF Web** — adds GitHub README fetch + Claude restructuring
8. **All CLI versions** — adapt from ReadmePDF CLI pattern
9. **All Action versions** — adapt from ReadmePDF Action pattern

---

## Revenue at Scale

At 500 subscribers per tool (15 products):
- **Monthly Revenue:** $37,500
- **Infrastructure:** ~$500
- **Stripe Fees:** ~$1,100
- **Net:** ~$35,900/month

At 200 subscribers per tool:
- **Monthly Revenue:** $15,000
- **Net:** ~$13,500/month

You need **1,000 total paying subscribers across all products** to hit $5k/month.
That's 67 subscribers per product. That's nothing.

---

## Launch Channels for Dev Tools

- **Product Hunt** — launch each tool separately, 2 weeks apart
- **Hacker News** — "Show HN: I built X because Pandoc/etc. was killing me"
- **r/webdev, r/programming, r/devops** — demo posts
- **GitHub itself** — star the action repo, it surfaces in search
- **Dev.to + Hashnode** — write "I built X in a weekend" articles
- **Twitter/X dev community** — short demo videos (screen record terminal → PDF appears)
- **npm trending** — good packages surface organically

---

*Raven's Gate Publishing LLC | Dev Tools Division*
