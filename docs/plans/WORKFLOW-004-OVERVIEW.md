# WORKFLOW-004 (OVERVIEW): Split, baseline & review resolution

## Status

- Status: DRAFT
- Owner: Claude Code
- Purpose: tài liệu điều phối — không phải plan thực thi. Ba plan con
  (004A/004B/004C) mới là đơn vị approve/implement.

## 1. Baseline snapshot

- Bản sửa đổi này soạn trên snapshot `main` tải ngày 2026-07-18 (tarball,
  không kèm git metadata). **Bắt buộc**: tại Stage 0 của mỗi plan con,
  implementer chạy và ghi vào handoff:

  ```bash
  git rev-parse HEAD
  git status --short
  node -p "Object.keys(require('./package.json').scripts).join('\n')"
  ls .github/workflows/
  ```

  Nếu HEAD khác snapshot soạn plan, đối chiếu lại các fact trong mục
  "Current system analysis" của plan con trước khi bắt đầu.

- Fact đã verify trên snapshot (căn cứ cho các quyết định):
  - `deploy.yml` trigger độc lập trên `push: main` + `workflow_dispatch`,
    tự build lại — artifact deploy KHÔNG được đảm bảo là artifact đã pass
    browser/PWA gates.
  - Architecture v2.2, Risk Model rule 2: deployment / infrastructure /
    security controls / "this architecture itself" ⇒ `CRITICAL`.
  - CI hiện có 2 job: `web` (format, catalog, content, lint, typecheck,
    unit, build, bundle, audit, license, upload artifact) và `browser`
    (tải artifact, E2E, PWA, PWA subpath).
  - `npm run build` hiện là lệnh gộp (chạy cả validate-content +
    typecheck trước vite build).
  - Tồn tại `.claude/skills/feature-delivery/SKILL.md` và
    `.codex/config.toml` (vendor-specific, phải xử lý trong 004B).

## 2. Split

| Plan | Nội dung | Tier | Phụ thuộc |
| --- | --- | --- | --- |
| 004A | Gate manifest + classifier + runner + check-docs + evidence snapshot + CI shadow/cutover + deployment gating. Amendment architecture **v2.3** (chỉ Validation Model / Evidence Binding / Deployment invariant). | CRITICAL | — |
| 004B | Governance trung lập vendor: roles + envelope + shims + PROJECT_CONTEXT + CONTEXT_RULES + provider runbooks + khử duplication + rút template. Amendment architecture **v2.4** (Responsibility Matrix trung lập, Context Policy, định nghĩa tier TRIVIAL). | CRITICAL | 004A merged |
| 004C | Enforce TRIVIAL (classifier + micro-trace) + đo token trước/sau. | ELEVATED | 004B merged |

Lý do thứ tự: 004A vá lỗ hổng deploy có thật (ưu tiên cao nhất) và tạo
công cụ (gates/evidence) mà 004B/004C tham chiếu. Không plan nào để repo
ở trạng thái nửa vời: mỗi plan tự đóng gói cutover của nó.

## 3. Review resolution matrix

Đối chiếu `WORKFLOW-004_PROJECT_GROUNDED_REVIEW_FOR_CLAUDE_v2.md`:

| Finding | Quyết định | Xử lý ở | Ghi chú |
| --- | --- | --- | --- |
| BLOCKER-01 CRITICAL reclassify | Accepted | 004A/004B header | Verify trực tiếp Risk Model rule 2 |
| BLOCKER-02 deployment path | Accepted | 004A §6.4 | DAG web→browser→deploy; deploy.yml chỉ còn manual có guard |
| BLOCKER-03 gate graph đầy đủ | Accepted | 004A §6.1 | 15 gate ID, verify lại từ package.json/YAML khi implement |
| BLOCKER-04 evidence exact snapshot, không đụng index thật | Accepted | 004A §6.3 | Option A (temp GIT_INDEX_FILE) mặc định; Option B fallback |
| HIGH-01 capability-based | **Modified** | 004B §6.2 | Nhận nguyên tắc (role trung lập; provider ≠ adapter ≠ host ≠ permission; FEATURE-014 là hạn chế của subagent sandbox, không phải Codex CLI). KHÔNG build capability resolver máy — thay bằng bảng execution profile trong provider runbooks + trường `capabilities_required` trong role contract. Lý do: 1 maintainer, resolver không bắt thêm lỗi nào mà bảng ngắn không bắt được |
| HIGH-02 explicit envelope, CLAUDE.md discovery shim | Accepted | 004B §6.3 | |
| HIGH-03 routing đa chiều | **Modified** | 004B §6.4 | Giữ retrieval triggers theo domain + hard triggers + request class; gộp vào một bảng CONTEXT_RULES thay vì ma trận 4 chiều đầy đủ |
| HIGH-04 TRIVIAL hẹp | Accepted | 004B (định nghĩa) + 004C (enforce) | Content units giữ NORMAL đợt đầu |
| HIGH-05 check-docs.ts | Accepted | 004A §6.2 | |
| HIGH-06 một manifest, không monolith | Accepted | 004A §6.1 | Thêm `build:app` atomic; giữ `npm run build` cho dev |
| HIGH-07 shadow CI | **Modified** | 004A §10 | Giữ shadow + negative tests nhưng rút gọn: planner test bằng fake runner (không spawn npm test lồng nhau), 1 PR chạy song song legacy/new, 6 negative fixtures chọn lọc, rồi cutover có checkpoint human. Bỏ benchmark p50/p95 nhiều vòng |
| MEDIUM-01 bỏ hardcode 102 tests | Accepted | 004A §15 | |
| MEDIUM-02 bỏ tag per-feature | Accepted | Ngoài scope cả 3 plan | |
| MEDIUM-03 phạm vi validator | Accepted | 004B shim wording | |
| MEDIUM-04 vendor name: cấm trong normative, cho phép trong config/runbook/README lịch sử | Accepted | 004B §15 | Sửa acceptance grep-proof cũ |
| MEDIUM-05 tách deliverable repo vs thao tác GitHub UI | Accepted | 004A §10/§15 | |
| MEDIUM-06 split 004A/B/C | Accepted | Tài liệu này | |

Ba mục Modified có chung một nguyên tắc đã thống nhất với Owner: mỗi
control phải trả lời được "nó bắt lỗi gì mà phương án nhẹ hơn không bắt
được"; control không trả lời được thì không đưa vào repo 1 maintainer.

## 4. Approval flow

Mỗi plan con approve riêng, thực thi theo đúng quy trình CRITICAL của
architecture **hiện hành tại thời điểm thực thi** (004A chạy dưới v2.2;
004B chạy dưới v2.3; 004C chạy dưới v2.4). Quy trình mới không được dùng
để tự phê duyệt chính nó.
