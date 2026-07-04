# Hoá học THCS — Web ôn luyện Hoá học cấp 2

Trang web giúp học sinh THCS (lớp 8–9) ôn luyện kiến thức Hoá học: lý
thuyết theo chuyên đề, bảng tuần hoàn, cân bằng phương trình, bài tập
trắc nghiệm và luyện đề.

> **Trạng thái:** mới khởi tạo khung dự án — chưa chốt tech stack và
> phạm vi tính năng. Bước tiếp theo: lập plan `FEATURE-001` (xem
> `AI_WORKFLOW.md`).

## Định hướng nội dung (dự kiến, sẽ chốt trong plan)

- **Lý thuyết theo chuyên đề** — bám chương trình Hoá 8, Hoá 9 (chất,
  nguyên tử, phân tử; phản ứng hoá học; mol và tính toán hoá học; oxi –
  không khí; hiđro – nước; dung dịch; kim loại; phi kim; hợp chất vô cơ;
  sơ lược hữu cơ).
- **Bảng tuần hoàn tương tác.**
- **Luyện tập** — trắc nghiệm theo chuyên đề, cân bằng phương trình,
  chuỗi phản ứng, bài toán mol.
- **Theo dõi tiến độ học.**

## Quy trình làm việc

Dự án dùng workflow Claude Code → Codex → Antigravity. Đọc theo thứ tự:

1. `AI_WORKFLOW.md` — quy trình chung và phân vai.
2. `CLAUDE.md` — vai trò Claude Code.
3. `AGENTS.md` — quy tắc cho Codex.
4. `docs/DOCUMENTATION_RULES.md` — quy tắc viết tài liệu.

Bắt đầu một tính năng:

```bash
git checkout -b feature/FEATURE-001
claude
# gõ: /feature-delivery <mô tả yêu cầu>
```

## Cấu trúc thư mục

```text
├── CLAUDE.md / AGENTS.md / AI_WORKFLOW.md   # chỉ dẫn cho các agent
├── .codex/config.toml                       # cấu hình model Codex
├── .claude/skills/feature-delivery/         # skill chạy trọn pipeline
├── docs/
│   ├── plans/          # kế hoạch kỹ thuật (FEATURE-NNN.md)
│   ├── handoffs/       # báo cáo triển khai của Codex
│   ├── adr/            # quyết định kiến trúc
│   ├── api/            # tài liệu API
│   └── runbooks/       # vận hành
├── src/                # source code (chưa chốt stack)
└── tests/
```

## Git

Repo này nằm trong `~/Documents/Code/` nên tự động dùng danh tính cá
nhân `tuann2 <tuann2@gmail.com>`. Khi cần đưa lên GitHub:

```bash
gh repo create Hoa_hoc_THCS --private --source . --push
```
