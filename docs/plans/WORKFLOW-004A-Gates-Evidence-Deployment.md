# WORKFLOW-004A: Mechanized gates, exact-snapshot evidence & deployment safety

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: nt0
- Approved date: 2026-07-18
- Risk tier: CRITICAL
- Risk categories: CI and deployment controls; validation and evidence
  controls; toolchain scripts; architecture amendment (Validation Model)
- Escalation rationale: Thay đổi đường deploy production (GitHub Pages),
  cơ chế validation/evidence mà mọi release dựa vào, và sửa chính
  architecture (amendment v2.3). Theo Risk Model v2.2 rule 2
  (deployment / security controls / architecture itself) ⇒ CRITICAL.
- Change type: Infrastructure or deployment + Application source or
  runtime config (scripts) + Documentation only (amendment)
- Quality gates: toàn bộ profile `full` trên chính candidate của plan
  này (dogfood), gồm cả browser/PWA job; cộng unit tests mới cho các
  script; cộng negative fixtures (§11). Gate thiếu lệnh ⇒ blocker.

## 1. Objective

1. Một nguồn thực thi duy nhất cho quality gates (manifest + runner)
   dùng chung bởi agent local và CI — hết drift giữa docs và CI.
2. Evidence gắn với snapshot chính xác, sinh bằng máy, không đụng index
   thật; thay đổi sau validation làm evidence stale một cách máy kiểm
   được.
3. Đóng lỗ hổng deploy: artifact lên GitHub Pages phải là đúng artifact
   đã pass web + browser/PWA gates; browser fail ⇒ không deploy.
4. Bổ sung gate docs (link/path/command) đang bị kiểm tay.

Không mục tiêu: agent-neutrality (004B), tier TRIVIAL (004B/004C),
giảm token đọc docs (004B).

## 2. Current system analysis

(Verify lại tại Stage 0 — xem OVERVIEW §1.)

- `ci.yml`: job `web` (install, format:check, check:content-catalog,
  validate-content, lint, typecheck, unit tests, build, check:bundle,
  audit, check:licenses, upload `production-dist`) → job `browser`
  (download artifact, Chromium, E2E, PWA, PWA subpath). Trigger:
  `push: feature/**` + `pull_request`. KHÔNG chạy trên `main`.
- `deploy.yml`: trigger riêng `push: main` + `workflow_dispatch`, tự
  build lại và deploy Pages — không phụ thuộc CI, không dùng artifact
  đã validate. Đây là lỗ hổng chính plan này đóng.
- `npm run build` là aggregate (validate-content + typecheck + vite
  build) ⇒ CI hiện chạy trùng validate-content/typecheck 2 lần.
- Evidence Binding v2.2 yêu cầu `git add -A && git stash create` trên
  index thật — mutate index, thủ công, dễ sai.
- Không có gate kiểm docs link/path/command.

## 3. Assumptions

- `tsx`, Vitest, Playwright đã có; không dependency mới.
- GitHub Pages tiếp tục là kênh deploy duy nhất.
- Human có quyền admin repo để chỉnh branch protection và required
  checks (thao tác ngoài git — checklist riêng, §10 Stage 6).
- Architecture v2.2 đang APPROVED; plan này chạy theo quy trình CRITICAL
  của v2.2.

## 4. Scope

- `scripts/gates-manifest.ts` — định nghĩa gate ID, lệnh, prerequisite,
  profile, mapping path→gate (dữ liệu thuần, export cho runner + tests).
- `scripts/classify-change.ts` — từ changed paths ⇒ union gates cần
  chạy; fail-closed với path không nhận diện.
- `scripts/gates.ts` — runner: chạy theo profile hoặc theo classifier,
  in kết quả cấu trúc (JSON + log người đọc được).
- `scripts/check-docs.ts` — gate docs mới.
- `scripts/evidence.ts` — snapshot + evidence JSON.
- `package.json`: thêm `gates`, `evidence`, `check:docs`, `build:app`
  (vite build thuần); GIỮ NGUYÊN ngữ nghĩa `npm run build` cho dev.
- `.github/workflows/ci.yml`: thêm trigger `main`; shadow rồi cutover
  các step sang gate ID; thêm job `deploy` (chỉ `main`, needs
  `browser`, dùng artifact `production-dist`).
- `.github/workflows/deploy.yml`: bỏ trigger `push: main`; giữ
  `workflow_dispatch` manual có guard (§6.4).
- Amendment architecture **v2.3**, phạm vi hẹp: (a) Evidence Binding —
  supersede nghi thức `git add -A && git stash create` bằng snapshot
  tree SHA sinh bởi `evidence.ts`, định nghĩa semantics + fallback; (b)
  Validation Model — bảng lệnh canonical tham chiếu manifest thay vì
  liệt kê; (c) thêm Deployment Invariant (§6.4). Không đụng roles, risk
  tiers, context policy (để dành v2.4/004B).
- Unit tests cho cả 5 script.

## 5. Out of scope

- Mọi thay đổi `src/`, `content/`, tests ứng dụng hiện có.
- AGENTS.md/CLAUDE.md/roles/context routing (004B).
- Tier TRIVIAL (004B định nghĩa, 004C enforce).
- Tag/release theo feature (đã loại theo MEDIUM-02).
- Tự động hóa branch protection (human làm theo checklist).

## 6. Proposed design

### 6.1 Gate manifest & runner

Gate ID canonical (verify lệnh thật từ `package.json`/YAML khi
implement, không tin bảng này mù quáng):

```text
git-diff-check      format-check       content-catalog
content-validation  lint               typecheck
unit-tests          production-build   bundle-check
dependency-audit    license-check      docs-check
e2e                 pwa                pwa-subpath
```

Profiles:

```text
web     = git-diff-check … license-check + docs-check (khi docs đổi)
browser = e2e, pwa, pwa-subpath (input: artifact production-dist)
docs    = git-diff-check, format-check, docs-check
full    = web + browser + docs
```

- `production-build` gọi `build:app` (vite thuần); `content-validation`
  và `typecheck` là gate riêng ⇒ hết chạy trùng. `npm run build` của dev
  không đổi và được ghi chú trong README.
- Runner: allowlist ID → argv array cố định (không string
  interpolation, không shell qua chuỗi ⇒ chặn command injection); in
  từng gate: ID, lệnh, exit code, duration; output JSON theo schema §6.3.
- `--profile=<p>` hoặc `--changed-from=<base_sha>` (dùng classifier).
  Caller khai type thấp hơn classifier tính ⇒ fail với thông báo union
  đúng. Path lạ ⇒ `full`.
- Ranh giới với GitHub Actions giữ nguyên: Actions lo permissions,
  artifact transfer, cài Chromium, Pages environment, concurrency;
  runner chỉ chạy lệnh và báo kết quả. Job `browser` trong CI vẫn là
  job riêng tải artifact — runner không tự dựng lại việc đó.

### 6.2 `check-docs.ts`

Kiểm trên các file .md thay đổi (hoặc toàn bộ với `--all`): link
Markdown tương đối; path repo được tham chiếu tồn tại; lệnh
`npm run <x>` được nhắc đến có trong `package.json`; path
plan/handoff/workflow được tham chiếu tồn tại. External URL: chỉ cảnh
báo, không fail (tránh CI flaky vì mạng).

### 6.3 Evidence — exact snapshot

Mặc định (Option A, Git-native):

```text
GIT_INDEX_FILE=$(mktemp)  # index tạm, không đụng index thật
  git read-tree HEAD
  git add -A               # vào index TẠM qua env var
  git write-tree           # ⇒ snapshot_tree_sha
```

- Không mutate index/worktree thật. Ghi chú công khai: write-tree có
  thể tạo object unreachable trong `.git` (vô hại, gc dọn).
- Tính snapshot TRƯỚC khi chạy gates và SAU khi chạy xong; lệch ⇒ run
  invalid, evidence bị từ chối. Tính lại lần nữa lúc handoff/release;
  lệch ⇒ stale.
- Fallback (Option B) khi runtime không có `git-metadata-write` (bài
  học FEATURE-014 — hạn chế của subagent sandbox): manifest determinstic
  {base_sha, path, mode, status, content-hash, deleted, untracked} →
  SHA-256 của manifest chuẩn hóa. Evidence ghi rõ `kind` nào được dùng.
  Quyền sở hữu việc sinh evidence thuộc môi trường orchestrator/harness
  bên ngoài khi sandbox bị hạn chế.

Output JSON (schema_version: 1): base_sha; candidate_sha hoặc
UNCOMMITTED; validated_snapshot {kind: git-tree | manifest, id};
started_at/finished_at UTC ISO 8601; node/npm versions; lockfile SHA;
gate_results[{id, command, exit_code, duration_ms}]; result. Kèm bản
render Markdown để paste handoff.

### 6.4 Deployment invariant

Ghi vào architecture v2.3:

> Artifact deploy lên production phải là chính artifact đã pass mọi
> gate bắt buộc (web + browser/PWA) cho đúng commit SHA đó. Browser/PWA
> fail ⇒ không deploy. Không đường deploy nào được bypass điều này.

Thực thi:

- `ci.yml` thêm job `deploy`: `if: github.ref == 'refs/heads/main' &&
  github.event_name == 'push'`, `needs: [web, browser]`, download
  `production-dist`, deploy Pages (permissions pages/id-token chỉ ở
  job này). Không rebuild.
- `deploy.yml`: xóa trigger `push`; giữ `workflow_dispatch` với input
  bắt buộc `candidate_sha`; job checkout đúng SHA đó và **assert qua
  GitHub API rằng required checks của SHA đã success** trước khi build
  + deploy; fail-closed nếu không xác nhận được. Ghi operator procedure
  vào runbook.

## 6a. New technology

Không có. Node built-in + devDependencies sẵn có.

## 7. Files to create

- `scripts/gates-manifest.ts`
- `scripts/classify-change.ts`
- `scripts/gates.ts`
- `scripts/check-docs.ts`
- `scripts/evidence.ts`
- `scripts/__tests__/` (hoặc theo convention test hiện có của repo —
  xác nhận khi implement): tests cho 5 script trên
- `docs/runbooks/DEPLOYMENT.md` (operator procedure cho manual deploy)

## 8. Files to modify

- `package.json` (scripts: `gates`, `evidence`, `check:docs`,
  `build:app`)
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (amendment v2.3, phạm
  vi hẹp §4)
- `README.md` (ghi chú `build` vs `build:app`; mục CI/deploy)

## 9. API and database impact

Không có. Không chạm Supabase/schema/API runtime.

## 10. Implementation steps

Stage 0 — Baseline: chạy bộ lệnh OVERVIEW §1, ghi HEAD + danh sách
check names hiện tại + cấu hình branch protection hiện tại (nếu có)
vào handoff. Chụp kết quả CI xanh gần nhất trên baseline.

Stage 1 — Manifest + classifier (pure data trước): implement + unit
tests cho mapping path→gates, hard fail path lạ, under-classification.
Test bằng fake runner/`--dry-run` — KHÔNG spawn `npm test` lồng trong
test đang chạy dưới `npm test`.

Stage 2 — `check-docs.ts` + tests; chạy `--all` một lần, sửa các link
gãy phát hiện được (nếu sửa vượt docs-only ⇒ báo Owner, không tự mở
rộng scope).

Stage 3 — `gates.ts` runner + `build:app`; chạy local profile `web` và
`docs`, so kết quả với các lệnh legacy trên cùng snapshot.

Stage 4 — `evidence.ts` + tests 6 trạng thái: clean; dirty tracked;
dirty untracked; deleted; có/không candidate commit; nội dung đổi giữa
before/after (phải invalid).

Stage 5 — CI shadow: PR của plan này chạy song song step legacy và
step mới (non-required) trên cùng commit; đối chiếu pass/fail từng
gate. Negative fixtures (nhánh tạm hoặc dry-run classifier tùy gate):
format violation, invalid content, type error, unit fail, bundle
overflow, broken docs link — cả legacy lẫn new phải fail. Ghi bảng đối
chiếu vào handoff. **Checkpoint human**: Owner duyệt bảng đối chiếu
trước khi sang Stage 6.

Stage 6 — Cutover + deploy gating: chuyển step CI sang gate ID; thêm
job `deploy` vào ci.yml; sửa deploy.yml (manual + guard); xóa step
legacy trùng. Human thực hiện checklist GitHub UI (tách bạch, không
phải deliverable git): require PR; required checks = tên check mới
(ghi đúng tên vào handoff); chặn force-push/delete; xác nhận push
thẳng `main` bị từ chối (negative test tay, ghi kết quả).

Stage 7 — Amendment v2.3 (docs-only, sau khi cơ chế đã chứng minh chạy)
→ human approve v2.3.

Stage 8 — Independent review theo CRITICAL v2.2: 1 fresh Gemini review
+ 1 fresh Codex adversarial review trên exact candidate snapshot, đọc
mọi changed line, tập trung: lỗ deploy bypass, fail-open trong
classifier/runner, evidence forgery. Findings → remediation state
machine. Release-readiness → human approve merge.

## 11. Test strategy

- Unit: manifest mapping; classifier fail-closed + under-classification;
  runner exit-code propagation + allowlist (từ chối ID lạ);
  check-docs (link gãy, path thiếu, script không tồn tại, external URL
  không fail); evidence 6 trạng thái + stale detection.
- Integration: profile `web`/`docs` local so với legacy trên cùng
  snapshot; CI shadow trên PR thật.
- Negative: 6 fixtures §10 Stage 5; push thẳng main bị chặn (tay);
  manual deploy với SHA chưa pass checks phải bị từ chối.
- Regression: toàn bộ tests phát hiện được trên candidate pass; ghi số
  lượng thực tế (unit + E2E + PWA + PWA-subpath) từ CI run cuối — KHÔNG
  hardcode con số trước.

## 12. Security considerations

- Runner: allowlist ID → argv cố định; không nhận lệnh tự do; không
  interpolation vào shell.
- Evidence: mặc định không ghi index/worktree thật; object unreachable
  được ghi chú; fallback manifest không ghi gì vào `.git`.
- Deploy: permissions `pages`/`id-token` chỉ trong job deploy; job
  khác giữ `contents: read`. Manual path assert checks qua API,
  fail-closed.
- Rủi ro lớn nhất: vô tình nới governance khi cutover — chốt bằng
  acceptance "không gate nào mất" (§15) + adversarial review nhắm đúng
  chỗ này.

## 13. Risks

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Runner/manifest lệch với lệnh thật trong package.json | Gate chạy sai | Stage 0 verify lệnh thật; test đối chiếu manifest ↔ scripts tồn tại |
| Cutover làm mất một gate | Suy yếu kiểm soát | Bảng đối chiếu shadow từng gate + checkpoint human + review adversarial |
| Đổi tên required checks làm branch protection hụt | PR merge không qua gate | Ghi đúng tên check mới vào handoff; human cập nhật protection cùng lúc cutover |
| Job deploy mới lỗi khiến không deploy được | Mất khả năng release tạm thời | deploy.yml manual có guard là đường dự phòng; rollback §14 |
| evidence.ts sai semantics trạng thái hiếm (rename, submodule) | Evidence sai | Tests 6 trạng thái + reviewer thử phá; rename coi như delete+add |
| Sandbox implementer không đủ capability (network/browser/git-write) | Không chạy đủ gates | Fallback Option B; browser gates chạy ở CI; ghi rõ môi trường nào sinh evidence |

## 14. Rollback plan

Một PR nguyên tử ⇒ revert 1 merge commit khôi phục ci.yml/deploy.yml/
scripts cũ. Branch protection chỉnh lại tay theo snapshot cấu hình đã
ghi ở Stage 0. Không migration/data. Amendment v2.3 revert cùng PR
(docs trong git).

## 15. Acceptance criteria

- [ ] Mọi gate class hiện có được bảo toàn sau cutover: format, catalog,
      content, lint, typecheck, unit, build, bundle, audit, license,
      E2E, PWA, PWA-subpath — chứng minh bằng bảng đối chiếu shadow +
      diff ci.yml.
- [ ] `docs-check` chạy được và fail đúng với link/path/command gãy;
      external URL không làm CI flaky.
- [ ] Classifier: path lạ ⇒ full; caller under-classify ⇒ fail.
- [ ] Evidence: PASS gắn snapshot ID chính xác; đổi file sau validation
      ⇒ stale (test chứng minh); không mutate index/worktree thật; đủ 6
      trạng thái; fallback cho sandbox hạn chế được tài liệu hóa.
- [ ] Browser/PWA fail ⇒ không deploy (fixture chứng minh trên nhánh
      thử hoặc log CI).
- [ ] Artifact deploy == artifact đã validate (job deploy chỉ download
      `production-dist`, không rebuild — diff YAML chứng minh).
- [ ] Đường push-deploy độc lập cũ đã bị gỡ; manual deploy không bypass
      được checks (negative test ghi trong handoff).
- [ ] CI chạy trên cả PR lẫn `main`; push thẳng `main` bị chặn (human
      xác nhận, ghi handoff kèm tên required checks).
- [ ] Toàn bộ tests phát hiện trên candidate pass; số lượng thực tế ghi
      từ CI run cuối.
- [ ] Amendment v2.3 APPROVED bởi human; independent + adversarial
      review CRITICAL hoàn tất, findings đã xử lý.
