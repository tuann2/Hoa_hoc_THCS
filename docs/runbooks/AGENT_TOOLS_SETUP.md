# Runbook: Cài đặt và cấu hình bộ công cụ AI Agent

Hướng dẫn thiết lập bộ ba công cụ cho luồng vibe-code với Claude Code +
Codex + Gemini (antigravity-cli).

## Tổng quan kiến trúc

```
Claude Code (claude CLI)
  ├── Orchestrator, reviewer, committer
  ├── Gọi Codex qua subagent codex:codex-rescue
  │     └── node codex-companion.mjs (shared runtime, sandbox write)
  └── Gọi Gemini qua agy CLI (antigravity-cli)
        └── Gemini 3.5 Flash / 3.1 Pro (review, docs)
```

---

## 1. Claude Code

### Cài đặt

```bash
npm install -g @anthropic-ai/claude-code
# hoặc qua brew
brew install claude-code
```

### Cấu hình cho repo mới

Mỗi repo cần 3 file để Claude biết vai trò:

| File                          | Mục đích                        |
| ----------------------------- | ------------------------------- |
| `CLAUDE.md`                   | Vai trò và luật của Claude Code |
| `AGENTS.md`                   | Luật của Codex                  |
| `docs/DOCUMENTATION_RULES.md` | Luật của Antigravity/Gemini     |
| `AI_WORKFLOW.md`              | Pipeline chung cho mọi agent    |

Copy từ repo này làm template (xem mục 5).

---

## 2. Codex (openai-codex plugin)

### Cài đặt

```bash
claude plugin install openai-codex
```

### Đăng nhập

```bash
codex login
# Hoặc qua Claude plugin interface
```

Nếu gặp lỗi 401 Unauthorized: chạy lại `codex login`.

### Fix bắt buộc: --cwd routing

**Vấn đề**: Khi Claude gọi `codex:codex-rescue` từ một session mở ở thư
mục A, Codex mặc định chạy ở thư mục A, không phải repo B dù prompt ghi
rõ đường dẫn B. Cờ `--cwd` tuy được `codex-companion.mjs` hỗ trợ nhưng
subagent definition không forward nó.

**Fix**: Thêm rule vào file subagent definition:

```bash
# Tìm đường dẫn file
CODEX_AGENTS_DIR=$(ls ~/.claude/plugins/cache/openai-codex/codex/*/agents/codex-rescue.md 2>/dev/null | head -1)
echo $CODEX_AGENTS_DIR
```

Mở file đó và thêm rule sau các rule `--effort`/`--model` hiện có:

```markdown
- If the request includes `--cwd <path>`, treat it as a routing control:
  strip it from the task text and pass it through as `--cwd <path>` to
  the codex-companion.mjs task invocation. Do not guess or infer the path;
  use exactly what was provided. If `--cwd` is absent, keep default
  behaviour (run in current working directory).
```

**Xác minh fix**:

```bash
# Tạo file thử nghiệm vô hại
Agent(subagent_type="codex:codex-rescue",
      prompt="--cwd /path/to/target-repo --write
      Tạo file docs/.codex-test.tmp với nội dung 'ok'. Sau đó xoá nó.")
```

Nếu file xuất hiện trong `target-repo` thì fix thành công.

**Lưu ý**: Fix nằm trong plugin cache — có thể bị ghi đè khi plugin
update. Kiểm tra lại nếu `--cwd` ngừng hoạt động.

### Cấu hình trust cho repo

Codex cần repo trong danh sách trusted:

```bash
cat ~/.codex/config.toml
# Nếu repo chưa có:
# [projects."/absolute/path/to/repo"]
# trust_level = "trusted"
```

Hoặc để Codex tự hỏi khi lần đầu chạy trong repo đó.

### Kiểm tra job đang chạy

```bash
node ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs \
  status --cwd /path/to/repo --all --json
```

### Mẫu prompt Codex chuẩn

```
--cwd /absolute/path/to/repo --write [--background|--wait]

<task>
[Mô tả task rõ ràng, đọc file nào trước, làm gì]
</task>

<verification_loop>
Chạy tuần tự và sửa tới khi tất cả PASS:
1. npm run validate-content (hoặc test suite tương đương)
2. npx prettier --write <file>
3. npm test
4. npm run lint
5. npm run typecheck
</verification_loop>

<action_safety>
Không commit, không push. Chỉ sửa <file(s) cụ thể>.
</action_safety>

<structured_output_contract>
Báo cáo cuối: kết quả từng lệnh PASS/FAIL + điểm nghi ngờ (nếu có).
</structured_output_contract>
```

---

## 3. Antigravity CLI (agy / Gemini)

### Cài đặt

```bash
# Kiểm tra
which agy

# Nếu chưa có — cài theo hướng dẫn tại antigravity.ai
# (yêu cầu gói pro)
```

### Đăng nhập và models

```bash
agy models
# Gemini 3.5 Flash (Low/Medium/High)
# Gemini 3.1 Pro (Low/High)
# Claude Sonnet 4.6, Claude Opus 4.6, GPT-OSS 120B
```

### Cách gọi từ Claude (synchronous — bắt buộc)

```bash
agy --model "Gemini 3.5 Flash (High)" \
    --add-dir /absolute/path/to/repo \
    -p "Prompt của bạn ở đây"
```

**Quan trọng**: KHÔNG dùng `run_in_background: true` trong Bash tool khi
gọi `agy`. Background mode trả về file output 0 byte. Luôn chạy đồng bộ
với `timeout: 300000` (5 phút).

### Use cases

| Use case                   | Model đề xuất             |
| -------------------------- | ------------------------- |
| Review số liệu/bài toán    | Gemini 3.5 Flash (High)   |
| Soạn thảo docs dài         | Gemini 3.1 Pro (High)     |
| Kiểm tra nhanh một vài câu | Gemini 3.5 Flash (Medium) |
| Cross-check logic phức tạp | Gemini 3.1 Pro (High)     |

---

## 4. Luồng vibe-code thực tế

### Bước 1 — Mở session Claude

```bash
claude
# Mở trong thư mục project chính hoặc bất kỳ thư mục nào
# Claude sẽ dùng --cwd khi gọi Codex/agy cho các repo khác
```

### Bước 2 — Lên plan

Claude soạn `docs/plans/FEATURE-XXX.md`, user approve.

### Bước 3 — Delegate cho Codex

Với task đơn:

```
Agent(subagent_type="codex:codex-rescue", prompt="--cwd /repo --write --wait <task>")
```

Với nhiều task độc lập (song song):

```
Agent(subagent_type="codex:codex-rescue", run_in_background=True,
      prompt="--cwd /repo --write --background <task A>")
Agent(subagent_type="codex:codex-rescue", run_in_background=True,
      prompt="--cwd /repo --write --background <task B>")
Agent(subagent_type="codex:codex-rescue", run_in_background=True,
      prompt="--cwd /repo --write --background <task C>")
# Tiết kiệm ~3x thời gian so với tuần tự
```

### Bước 4 — Review kép (cho nội dung rủi ro cao)

```
# Song song:
Codex  → re-solves, fixes in-place
agy    → independent cross-check, reports only

# Claude reconciles, commits
```

### Bước 5 — Validate và commit

```bash
cd /path/to/repo
npm run validate-content && npx prettier --write <file> \
  && npm test && npm run lint && npm run typecheck
git add <specific-files>
git commit -m "content: add <unit> (FEATURE-XXX)"
git push
```

### Bước 6 — Merge và deploy

User review PR trên GitHub, merge, GitHub Actions deploy tự động.

---

## 5. Template files để copy cho project mới

Khi bắt đầu project mới với cùng AI workflow, copy 4 file sau và chỉnh
phần "Project context" / validation commands:

```bash
cp CLAUDE.md /new-project/CLAUDE.md
cp AGENTS.md /new-project/AGENTS.md
cp AI_WORKFLOW.md /new-project/AI_WORKFLOW.md
cp docs/DOCUMENTATION_RULES.md /new-project/docs/DOCUMENTATION_RULES.md
```

Điều chỉnh bắt buộc trong mỗi file:

| File             | Điều chỉnh                                           |
| ---------------- | ---------------------------------------------------- |
| `CLAUDE.md`      | Project context, đường dẫn repo, validation commands |
| `AGENTS.md`      | Validation commands (npm/cargo/python tùy stack)     |
| `AI_WORKFLOW.md` | Validation commands, đường dẫn repo trong ví dụ      |

---

## 6. Troubleshooting

### Codex lỗi 401 Unauthorized

```bash
codex login
```

### Codex viết vào sai thư mục (session cwd thay vì target repo)

→ Thiếu `--cwd` hoặc chưa áp dụng fix subagent definition (xem mục 2).

### agy không in output khi chạy background

→ Bình thường — background mode không ghi output. Chạy synchronous.

### Codex job bị treo (running mãi không xong)

```bash
# Kiểm tra
node ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs \
  status --cwd /repo --all --json

# Nếu stuck: đăng nhập lại
codex login
```

### Plugin Codex update ghi đè fix --cwd

→ Áp dụng lại fix (mục 2). Kiểm tra sau mỗi lần `claude plugin update`.
