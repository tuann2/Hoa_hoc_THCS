# FEATURE-013 Implementation Handoff

<!--
The only post-implementation orchestration artifact (architecture
Documentation Contract). Living document: fill review fields with
PENDING before independent review; update them with outcomes.
Regenerate after remediation; mark superseded evidence STALE.
-->

## Status

- Remediation state: RELEASE_READY
- Risk tier: CRITICAL
- Risk categories: dependency security remediation; CI infrastructure change
- Escalation rationale: vá advisory dependency và thêm gate CI bảo mật/chất lượng

## 1. Summary

Nâng và pin exact `react-router-dom@6.30.4`, `vite@6.4.3`,
`postcss@8.5.19`, `vitest@3.2.7`; cập nhật lockfile bằng npm; đồng bộ
`allowScripts` còn đúng `esbuild@0.25.12`. Không cần sửa runtime app hay
test config để tương thích Vite 6 / Vitest 3.

Đã thêm `scripts/check-licenses.ts`, script `npm run check:licenses`,
negative fixture/test cho fail-path, và mở rộng CI với `format:check`,
`npm audit --audit-level=moderate`, `npm run check:licenses`. Trong đợt
remediation này, script license check được vá thêm hai điểm theo review:

- chặn lockfile-key path traversal trước khi đọc `package.json` dưới
  `node_modules/`
- không còn skip package optional / platform-specific khi metadata vắng
  mặt trên OS hiện tại; checker luôn dùng `package-lock.json` license nếu
  có, và report `<missing>` nếu lockfile cũng thiếu license
- không còn fail-open khi lockfile key traversal bị containment check trả
  `null`; checker giờ report issue `license: <invalid path>` thay vì
  `continue` im lặng

Evidence validation trước remediation (2026-07-13T16:03:06Z ->
2026-07-13T16:03:44Z, rồi 2026-07-13T16:37:08Z -> 2026-07-13T16:37:45Z)
là `STALE`; snapshot hiện tại thay thế toàn bộ evidence đó.

Acceptance criteria:

- PASS: 4 dependency mục tiêu được pin exact (`vite` theo amendment đã duyệt là
  `6.4.3`).
- PASS: `npm audit --audit-level=moderate` exit 0 trên exact lockfile.
- PASS: `npm run check:licenses` pass trên tree thật; test chứng minh script
  fail đúng với license ngoài allowlist, report traversal entry bằng
  `license: <invalid path>`, và dùng lockfile license cho optional package
  không cài trên runner hiện tại; nếu lockfile cũng thiếu license thì bị
  report `<missing>`.
- PASS: CI workflow đã có `format:check`, `audit`, `check:licenses` cùng các
  gate cũ.
- PASS: bộ test cũ 87/87 tiếp tục pass trên Vitest 3; tổng suite hiện tại là
  92/92 sau khi thêm 5 test cho license checker; build pass; không dùng
  `npm audit fix --force`.
- PASS: `allowScripts` khớp tree thực tế sau nâng Vite 6 (`esbuild@0.25.12`).
- PASS: fresh Gemini review (2 vòng) và fresh Codex adversarial review
  (2 vòng) đã hoàn tất; mọi finding trong scope đã FIXED, xem mục 7.
- PASS: CI xanh trên candidate commit `d3bd0f9` (run 29295899405), bao gồm
  toàn bộ step mới.

## 2. Files changed

| File                                                                        | Change                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `package.json`                                                              | Pin dependency versions, thêm `check:licenses`, cập nhật `allowScripts`                    |
| `package-lock.json`                                                         | Regenerate lockfile cho dependency tree mới                                                |
| `.github/workflows/ci.yml`                                                  | Thêm `format:check`, `audit`, `check:licenses`                                             |
| `scripts/check-licenses.ts`                                                 | License allowlist checker chạy bằng `tsx`; vá traversal + lock fallback                    |
| `tests/scripts/check-licenses.test.ts`                                      | Test OR-expression, fail-path, traversal, optional lock fallback, missing optional license |
| `tests/fixtures/check-licenses/invalid-license/package-lock.json`           | Fixture lockfile cho fail-path                                                             |
| `tests/fixtures/check-licenses/path-traversal/package-lock.json`            | Fixture lockfile cho traversal case                                                        |
| `tests/fixtures/check-licenses/optional-lockfile-license/package-lock.json` | Fixture lockfile cho optional/platform package case                                        |
| `tests/fixtures/check-licenses/optional-missing-license/package-lock.json`  | Fixture lockfile cho optional package thiếu license                                        |
| `docs/handoffs/FEATURE-013-implementation.md`                               | Handoff implementation                                                                     |

```text
 .github/workflows/ci.yml |   9 +
 package-lock.json        | 736 +++++++++++++----------------------------------
 package.json             |  12 +-
 3 files changed, 221 insertions(+), 536 deletions(-)
```

Untracked additions not shown by `git diff --stat`:

- `docs/handoffs/FEATURE-013-implementation.md`
- `scripts/check-licenses.ts`
- `tests/scripts/check-licenses.test.ts`
- `tests/fixtures/check-licenses/invalid-license/package-lock.json`
- `tests/fixtures/check-licenses/optional-lockfile-license/package-lock.json`
- `tests/fixtures/check-licenses/optional-missing-license/package-lock.json`
- `tests/fixtures/check-licenses/path-traversal/package-lock.json`

## 3. Evidence binding

- Base commit SHA (`HEAD` when validation started): `0c61a1adf450de229b8e76a612eb02b3cd68b17b`
- Candidate commit SHA: `d3bd0f9` (pushed to `feature/FEATURE-013`; tree
  content identical to the validated implementation-tree snapshot below plus
  this handoff file itself)
- Validated implementation-tree SHA: `f98f8eb726e3b4149865d93515051cfa652bb40c7f9bbdd6021b9ba07fdd488b`
- Implementation-tree exclusions:
  `docs/handoffs/FEATURE-013-implementation.md` (snapshot hash là SHA-256
  tổng hợp trên tracked + untracked non-ignored files vì `.git` đang
  read-only trong execution này, nên không thể materialize git tree object)
- Dirty-worktree state and exact dirty paths: dirty;
  `.github/workflows/ci.yml`, `package-lock.json`, `package.json`,
  `docs/handoffs/FEATURE-013-implementation.md`,
  `scripts/check-licenses.ts`,
  `tests/fixtures/check-licenses/invalid-license/package-lock.json`,
  `tests/fixtures/check-licenses/optional-lockfile-license/package-lock.json`,
  `tests/fixtures/check-licenses/optional-missing-license/package-lock.json`,
  `tests/fixtures/check-licenses/path-traversal/package-lock.json`,
  `tests/scripts/check-licenses.test.ts`
- Validation start (UTC, ISO 8601): `2026-07-13T16:47:22Z`
- Validation completion (UTC, ISO 8601): `2026-07-13T16:48:42Z`
- Runtime / package-manager versions: `node v22.22.1`; `npm 10.9.4`
- Validation-tool versions or lockfile SHA: `package-lock.json sha256 5b918626ebc275d1773890f188407ed963ca4f8f2f5f70945d6e4b11a32f2fba`

## 4. Validation commands and gates

| Command                            | Exit status | Quality gate satisfied           |
| ---------------------------------- | ----------- | -------------------------------- |
| `git diff --check`                 | 0           | Diff hygiene                     |
| `npm run format:check`             | 0           | Formatting                       |
| `npm run validate-content`         | 0           | Content/schema                   |
| `npm run lint`                     | 0           | Lint                             |
| `npm run typecheck`                | 0           | Type safety                      |
| `npm test`                         | 0           | Unit/component/script regression |
| `npm run build`                    | 0           | Production build                 |
| `npm run check:licenses`           | 0           | License allowlist                |
| `npm audit --audit-level=moderate` | 0           | Dependency security audit        |

Additional spot checks:

- `dist/404.html` present after build.
- Earlier remediation validation attempts are `STALE` because the candidate
  changed again after Gemini round 2 and all applicable gates were rerun for
  the snapshot above.

## 5. Design decisions

- Dùng `vite@6.4.3` theo amendment đã duyệt để thoát toàn bộ advisory mới bao
  phủ `vite<=6.4.2`; không mở rộng tiếp sang Vite 7/8.
- License checker resolve tuyệt đối `node_modules/<pkg>/package.json` và bỏ qua
  mọi lockfile key thoát ra ngoài `rootDir/node_modules`, nên malicious path
  không thể khiến CI đọc file tuỳ ý.
- Khi package thật không tồn tại trên runner hiện tại, checker dùng
  `package-lock.json` license làm nguồn authoritative. Nếu lockfile cũng không
  có license, entry bị report `<missing>` bất kể có `optional: true` hay không;
  không còn nhánh skip im lặng cho optional package.
- Bổ sung `CC-BY-4.0` (`caniuse-lite`) và `MIT-0`
  (`@csstools/color-helpers`) vào allowlist vì tree thật đang dùng hai license
  hợp lệ này.
- Không đổi `vite.config.ts`, `tests/setup.ts` hay runtime `src/`; Vite 6 và
  Vitest 3 tương thích snapshot hiện tại mà không cần patch behavior.
- Test harness tạo package manifests trong thư mục tạm thay vì commit fixture
  dưới `tests/**/node_modules`, để tránh xung đột với `.gitignore`.

## 6. Deviations from the approved plan

- `vite` dùng `6.4.3` thay vì target ban đầu `5.4.21`, theo amendment đã được
  con người duyệt trong chính `docs/plans/FEATURE-013.md`, vì ba advisory mới
  (`GHSA-4w7w-66w2-5vf9`, `GHSA-v6wh-96g9-6wx3`, `GHSA-fx2h-pf6j-xcff`) ảnh
  hưởng toàn bộ `vite<=6.4.2`.
- Allowlist thực tế mở rộng thêm `CC-BY-4.0` và `MIT-0` so với danh sách khởi
  điểm ở mục 6.2 của plan, để phản ánh dependency tree thật sau validation.

## 7. Independent verification

- Verifier identity: fresh Gemini review; fresh Codex adversarial review
- Execution identifier: current working-tree reviews on 2026-07-13
- Independence method: fresh read-only executions against the pre-remediation
  candidate
- CI commit SHA and status: `d3bd0f9` — SUCCESS (run
  [29295899405](https://github.com/tuann2/Hoa_hoc_THCS/actions/runs/29295899405),
  all steps green including new `format:check`, `audit`, `check:licenses`)
- Review findings and disposition:
  - FIXED: Gemini finding về path traversal trong
    `scripts/check-licenses.ts` (`node_modules/../../...` lockfile key có thể
    escape khỏi `rootDir/node_modules`) đã được vá bằng absolute path
    resolution + containment check trước khi đọc `package.json`.
  - FIXED: Codex adversarial review round 2 finding về path traversal
    fail-open trong `collectLicenseIssues`: khi
    `resolvePackageJsonPath()` trả `null` cho lockfile key escape khỏi
    `rootDir/node_modules`, script từng `continue` và làm package biến mất
    khỏi license enforcement. Đã đổi sang tăng `checkedPackages` và push
    `LicenseIssue` với package/version từ lockfile cùng marker
    `license: <invalid path>`, nên `main()` fail closed thay vì pass im lặng.
  - FIXED: Gemini round 2 finding về package `optional: true` không được cài
    trên OS hiện tại, thiếu cả metadata lẫn `license` trong `package-lock.json`,
    từng bị skip im lặng. Đã bỏ hẳn nhánh `continue`; checker giờ vẫn tính
    package đó và report `license: <missing>` như mọi package khác.
  - OUT OF SCOPE HERE: finding riêng của Codex adversarial
    "`deploy.yml` bypasses the audit/license gate" không sửa trong feature này
    theo plan section 5 (`deploy.yml` explicit out of scope); cần track và xử
    lý ở feature/work item riêng.
  - CLOSED (Claude Gate, không mở vòng review độc lập mới): fix fail-closed
    ở trên là triển khai trực tiếp, nguyên văn khuyến nghị của chính Codex
    adversarial review round 2 cho một block code đã qua 2 vòng review độc
    lập (Gemini + Codex adversarial) trước đó; thay đổi chỉ 2 dòng, không mở
    thêm attack surface (chỉ làm hành vi nghiêm ngặt hơn: fail thay vì bỏ
    qua). Claude (Architect) tự inspect toàn bộ diff cuối cùng dòng-theo-dòng,
    xác nhận logic + assertion test khớp finding, và rerun toàn bộ 9 gate độc
    lập (không dựa vào output do agent implement báo cáo) — tất cả pass. Theo
    phán đoán rủi ro, không mở vòng review độc lập thứ 3 cho delta hẹp này.

## 8. Blockers

- None

## 9. Known limitations

- `npm run check:licenses` hiện hỗ trợ exact SPDX string và biểu thức `OR`
  đơn giản; không cố parse đầy đủ mọi dạng SPDX phức tạp hơn vì tree hiện tại
  không cần.
- Gemini round 2 cũng note một khả năng Low/theoretical liên quan
  case-sensitivity của prefix `node_modules/` vs `Node_modules/`. Không sửa ở
  đây vì CI chuẩn của feature chạy trên `ubuntu-latest` (filesystem
  case-sensitive) và `npm` không tạo thư mục `Node_modules`, nên finding này
  không ảnh hưởng môi trường gate đã duyệt.
- Build vẫn cảnh báo bundle JS lớn hơn 500 kB; đây là warning đã biết và thuộc
  scope `FEATURE-014`, không phải regression của feature này.

## 10. Remaining risks

- Không còn risk chặn release. `deploy.yml` chưa chạy audit/license/test/lint
  (finding ngoài scope, xem mục 7) vẫn là gap đã biết, tracked riêng, không
  phải regression của feature này.

## 11. Follow-up work

- Theo dõi và lên plan riêng cho gap `deploy.yml` thiếu lint/test/audit
  (workflow audit 2026-07-12, gap 2).
- FEATURE-014 (code splitting, PWA offline, E2E) phụ thuộc feature này đã
  merge — sẵn sàng bắt đầu sau khi FEATURE-013 merge vào `main`.
