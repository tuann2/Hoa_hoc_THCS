# FEATURE-013: Vá dependency bảo mật và bổ sung gate audit/license/format vào CI

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (thu hẹp từ draft của Codex sau review 2026-07-13; phần
  code splitting + PWA + E2E tách sang `docs/plans/FEATURE-014.md`)
- Approved by: nt0
- Approved date: 2026-07-13
- Risk tier: CRITICAL
- Risk categories: dependency security remediation; CI infrastructure change
- Escalation rationale: xử lý advisory XSS/critical trong dependency là thay
  đổi security control; sửa `.github/workflows/ci.yml` là thay đổi
  infrastructure. Theo Risk Model, cả hai đều thuộc mức CRITICAL.
- Change type: Dependencies or lockfiles; Infrastructure or deployment
- Quality gates: `git diff --check`; `npm run format:check`;
  `npm run validate-content`; `npm run lint`; `npm run typecheck`; `npm test`;
  `npm run build`; `npm run check:licenses`;
  `npm audit --audit-level=moderate`; CI trên đúng candidate commit; fresh
  Gemini review và fresh Codex adversarial review. `npm run check:licenses`
  phải tồn tại trước validation; thiếu bất kỳ gate nào là blocker.

> Governance note: bản này do Claude (Architect) thu hẹp từ draft gốc của
> Codex theo quyết định tách scope của con người (2026-07-13). Không được
> triển khai hoặc nâng dependency trước khi Status chuyển thành `APPROVED`.
> Feature này KHÔNG thêm công nghệ mới — chỉ nâng version dependency đã có
> và thêm script nội bộ chạy bằng `tsx` sẵn có.
>
> **Amendment 2026-07-13 (con người duyệt qua Claude, cùng ngày với approval
> gốc):** trong lúc implement, phát hiện advisory mới ngoài dòng `vite@5.4.x`
> (xem mục 2/4). Target `vite` đổi từ `5.4.21` sang `6.4.3`; mọi mục khác của
> plan không đổi. Đây là amendment trong cùng phiên duyệt, không phải plan
> mới.

## 1. Objective

Loại bỏ toàn bộ advisory dependency đã biết và đưa các gate bảo mật/chất
lượng còn thiếu vào CI:

1. Vá advisory XSS ở React Router (high), advisory critical ở Vitest,
   advisory moderate ở Vite/esbuild và PostCSS.
2. Thêm CI gate `npm audit --audit-level=moderate` và license allowlist
   check để advisory/license vi phạm bị chặn tự động về sau.
3. Đóng gap đã ghi nhận trong workflow audit 2026-07-12: CI thiếu
   `npm run format:check`.

Kết quả phải giữ nguyên toàn bộ hành vi ứng dụng: không đổi UI, routing
behavior, nội dung, progress hay Supabase sync.

## 2. Current system analysis

### Dependency và security baseline

- `react-router-dom@6.30.1` kéo `@remix-run/router@1.23.0` và đang bị
  `GHSA-2w69-qvjg-hvjx` (XSS qua open redirect), mức high. Bản vá trong
  dòng 6.x là `react-router-dom@6.30.4` (bản 6.30.x mới nhất trên registry).
- `vite@5.4.19`/esbuild có advisory mức moderate; bản 5.4.x mới nhất là
  `vite@5.4.21`.
- **Cập nhật 2026-07-13 (sau approval ban đầu):** trong lúc implement, phát
  hiện 3 advisory mới publish sau khi plan được duyệt, ảnh hưởng toàn bộ dải
  `vite<=6.4.2` (tức là toàn bộ dòng 5.4.x không có bản vá):
  `GHSA-4w7w-66w2-5vf9` (path traversal, moderate, publish 2026-04-06),
  `GHSA-v6wh-96g9-6wx3` (NTLMv2 hash disclosure qua launch-editor, moderate,
  publish 2026-06-01), `GHSA-fx2h-pf6j-xcff` (`server.fs.deny` bypass, high,
  publish 2026-06-01). Không có patch nào trong minor `5.4.x`; bản vá sớm
  nhất là `vite@6.4.3`. Đã xác minh `@vitejs/plugin-react@4.7.0` (bản đang
  pin, không đổi) có peerDependency `^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0`
  nên tương thích `vite@6.4.3` mà không cần nâng thêm dependency nào khác.
  Con người đã duyệt nâng đích lên `vite@6.4.3` thay vì `5.4.21` (xem mục 4).
- `postcss@8.5.6` có advisory XSS mức moderate; bản không bị ảnh hưởng bắt
  đầu từ `8.5.10`, bản 8.5.x mới nhất đã xác minh trên registry là `8.5.19`.
- `vitest@2.1.9` có advisory `GHSA-5xrq-8626-4rwp` (đọc/thực thi file qua UI
  server) mức critical, vá từ `3.2.6`; bản 3.2.x mới nhất đã xác minh là
  `3.2.7`. Đây là major upgrade (2 → 3) và phải chạy toàn bộ test suite để
  phát hiện breaking change.
- Baseline xác minh lại ngày 2026-07-13: `npm audit` báo 7 vulnerabilities
  (2 moderate, 4 high, 1 critical); 87 unit/component tests pass.
- `package.json` có field `allowScripts` pin `esbuild@0.25.12` và
  `esbuild@0.21.5`; nâng Vite/Vitest có thể đổi version esbuild transitive
  nên field này phải được rà và cập nhật cùng lần nâng.
- Không dùng `npm audit fix --force`. Mỗi dependency nâng có chủ đích, pin
  exact version và review diff lockfile.

### CI baseline

- CI (`.github/workflows/ci.yml`) hiện chạy `npm ci`, lint, typecheck,
  `npm test`, build trên Node 22; chưa có `format:check`, audit hay license
  check. `npm run format:check` baseline hiện pass toàn repo nên thêm gate
  này không làm CI đỏ.
- `deploy.yml` build và deploy lên GitHub Pages, không chạy lint/test —
  gap này đã ghi nhận trong workflow audit 2026-07-12 và KHÔNG xử lý trong
  feature này (xem Out of scope).

## 3. Assumptions

- Node 22 trong CI vẫn là runtime chuẩn.
- GitHub Pages, Supabase, schema database và nội dung Hoá học không đổi.
- Registry state theo thời điểm xác minh 2026-07-13; nếu advisory mới xuất
  hiện sau approval, xử lý theo mục 12/13.
- Script license check chạy bằng `tsx` đã có trong devDependencies, không
  cần dependency mới, không gọi service bên ngoài.
- Vitest 3 giữ được toàn bộ 87 test hiện có; nếu có breaking change thì sửa
  test cho tương thích, không giảm assertion.

## 4. Scope

### A. Nâng dependency bảo mật

- Nâng và pin exact:
  - `react-router-dom`: `6.30.1` -> `6.30.4`.
  - `vite`: `5.4.19` -> `6.4.3` (sửa từ `5.4.21` sau khi phát hiện advisory
    mới ngoài dòng 5.4.x — xem mục 2 "Cập nhật 2026-07-13"; con người đã
    duyệt vượt minor line ban đầu).
  - `postcss`: `8.5.6` -> `8.5.19`.
  - `vitest`: `2.1.9` -> `3.2.7`.
- Cập nhật lockfile bằng npm chuẩn, không sửa tay, không `--force`.
- Rà và cập nhật field `allowScripts` trong `package.json` nếu version
  esbuild transitive thay đổi.
- Xử lý regression do Vitest 3 nếu có; không tắt test, không giảm assertion
  và không nới ESLint/TypeScript để che lỗi.

### B. Gate mới trong CI

- Thêm step `npm run format:check` (đóng gap workflow audit 2026-07-12).
- Thêm step `npm audit --audit-level=moderate`. Nếu registry advisory hoặc
  dependency transitive khiến gate không thể đạt, dừng và sửa plan/ghi
  blocker; không thêm ignore không có expiry/rationale.
- Thêm script `scripts/check-licenses.ts` (license allowlist, đọc metadata
  từ `node_modules`/lockfile, không phụ thuộc service bên ngoài) và step
  `npm run check:licenses`. Script phải fail với license thiếu/không
  rõ/ngoài allowlist và in đúng package gây lỗi.

## 5. Out of scope

- Code splitting, catalog nội dung, PWA/offline, Playwright E2E, bundle
  budget — toàn bộ thuộc `FEATURE-014` (phụ thuộc feature này merge trước).
- Sửa `deploy.yml` (gap "deploy.yml thiếu lint/test" xử lý riêng khi có
  quyết định của con người).
- Nâng React 18 lên 19, React Router 6 lên 7, Vite lên major mới hơn `6.4.3`
  (ví dụ dòng 7.x/8.x), Vitest lên 4. Trong minor/dòng đã duyệt (bao gồm
  `vite@6.4.3` sau amendment 2026-07-13), được phép lấy patch mới nhất tại
  thời điểm implement nếu registry có bản mới hơn version pin ở mục 4 — ghi
  rõ trong handoff; ngoài dòng đã duyệt phải xin duyệt lại.
- Sửa nội dung/đáp án Hoá học, Supabase, auth flow, database schema.
- Thêm dependency mới dưới mọi hình thức.

## 6. Proposed design

### 6.1. Trình tự nâng dependency

Nâng theo 2 nhóm để cô lập regression:

1. Nhóm runtime: `react-router-dom` (một mình, chạy đủ gates — đây là thay
   đổi duy nhất chạm code production).
2. Nhóm tooling: `vite`, `postcss`, `vitest` (chạy đủ gates sau khi nâng;
   Vitest 3 đọc migration notes trước, sửa config/test tương thích nếu cần).

Cả hai nhóm nằm trong cùng một final snapshot; việc tách nhóm chỉ để debug
khi gate fail, không tạo hai đợt release.

### 6.2. License check

`scripts/check-licenses.ts`:

- Đọc danh sách package production + dev từ `package-lock.json`, lấy
  `license` field từ `node_modules/<pkg>/package.json`.
- Allowlist khởi điểm: `MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`,
  `BSD-3-Clause`, `0BSD`, `CC0-1.0`, `Unlicense`, `BlueOak-1.0.0`,
  `Python-2.0` (điều chỉnh trong implementation nếu phát hiện license hợp
  lệ khác — mọi bổ sung allowlist phải ghi trong handoff).
- Exit khác 0 và in tên package + license khi gặp license thiếu/không
  parse được/ngoài allowlist. Hỗ trợ SPDX expression đơn giản (`OR`):
  pass nếu ít nhất một nhánh nằm trong allowlist.

### 6.3. CI structure

Vẫn một job `web`, thêm step theo thứ tự:

```text
npm ci
  -> npm run format:check   (mới)
  -> npm run lint
  -> npm run typecheck
  -> npm test
  -> npm audit --audit-level=moderate   (mới)
  -> npm run check:licenses             (mới)
  -> npm run build
```

Do risk tier `CRITICAL`, sau handoff cần một fresh Gemini review và một
fresh Codex adversarial review, kiểm tra toàn bộ diff (đặc biệt diff
lockfile: version resolve đúng, không có package lạ, không có install
script/native binary mới) và CI phải xanh trên đúng candidate commit.

## 6a. New technology (bỏ qua nếu không áp dụng)

Không áp dụng — chỉ nâng version dependency hiện có trong minor line và
thêm script nội bộ chạy bằng `tsx` sẵn có. Không cần cập nhật
`docs/architecture.md` ngoài bảng version nếu có.

## 7. Files to create

- `scripts/check-licenses.ts`
- `docs/handoffs/FEATURE-013-implementation.md`

## 8. Files to modify

- `package.json` (versions, script `check:licenses`, field `allowScripts`
  nếu cần)
- `package-lock.json`
- `.github/workflows/ci.yml`
- Test/config bị ảnh hưởng bởi Vitest 3 (nếu có; liệt kê trong handoff)
- `README.md` chỉ khi cần mô tả gate mới

Không được sửa `content/units/*.json`, `src/` runtime logic (ngoài thay
đổi bắt buộc do API test thay đổi), Supabase hoặc `deploy.yml`.

## 9. API and database impact

- Không có public HTTP API mới, không database migration.
- Không đổi internal API. Nếu Vitest 3 buộc đổi test setup
  (`tests/setup.ts`, `vite.config.ts` phần `test`), thay đổi giới hạn trong
  test config và phải nêu trong handoff.

## 10. Implementation steps

1. Trên branch `feature/FEATURE-013`, ghi base SHA và baseline evidence
   (audit output, test count 87, format:check pass).
2. Nâng `react-router-dom` -> `6.30.4`, chạy đủ canonical gates.
3. Nâng `vite`/`postcss`/`vitest` theo mục 6.1, đọc Vitest 3 migration
   notes, sửa config/test tương thích nếu cần, rà `allowScripts`, chạy đủ
   canonical gates.
4. Viết `scripts/check-licenses.ts` + script `check:licenses` trong
   `package.json`; thêm negative fixture/unit test chứng minh script fail
   đúng cách.
5. Cập nhật `.github/workflows/ci.yml` theo mục 6.3.
6. Chạy một lần toàn bộ gate ở mục 11 trên snapshot cuối, ghi Evidence
   Binding đầy đủ và tạo handoff từ template.
7. Fresh Gemini + fresh Codex adversarial review. Finding làm thay đổi
   candidate phải quay lại remediation, rerun toàn bộ applicable gates và
   cập nhật handoff; không tái sử dụng evidence cũ.
8. Claude đánh giá release readiness; con người quyết định commit/push/PR/
   merge.

## 11. Test strategy

### Regression

- Toàn bộ 87 unit/component test hiện có pass trên Vitest 3.
- `npm run build` pass; sanity check output `dist/` vẫn có `404.html`.
- Routing smoke qua test hiện có (React Router chỉ nâng patch trong 6.30.x
  nên không đổi behavior; advisory fix liên quan open redirect được cover
  bằng việc không đổi cách dùng router).

### Gate mới

- `npm audit --audit-level=moderate` exit 0 trên exact lockfile.
- `npm run check:licenses` exit 0 trên dependency tree thật; negative
  fixture chứng minh fail đúng khi license thiếu/ngoài allowlist.
- CI xanh trên candidate commit với đủ step mới.

### Security/dependency

- Review diff `package-lock.json`: đúng version đích, không package lạ,
  không install script/native binary mới ngoài esbuild đã khai báo trong
  `allowScripts`.

### Required final commands

```bash
git diff --check
npm run format:check
npm run validate-content
npm run lint
npm run typecheck
npm test
npm run build
npm run check:licenses
npm audit --audit-level=moderate
```

## 12. Security considerations

- Không dùng `npm audit fix --force`, không override/resolution không giải
  thích, không ignore advisory không có expiry/rationale.
- Nếu vá advisory đòi hỏi nâng major ngoài các minor đã duyệt ở mục 4,
  dừng và xin duyệt revised plan.
- Diff lockfile phải được review thủ công trong adversarial review: package
  mới xuất hiện, install script, đổi registry URL đều là red flag.
- Script license check không gửi dữ liệu ra ngoài, không đọc file ngoài
  repo/node_modules.
- Không đổi permissions GitHub Actions; không thêm action mới.

## 13. Risks

| Risk                                              | Impact                              | Mitigation                                                                                   |
| ------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Vitest 2 -> 3 gây regression test runtime         | CI fail hoặc behavior test khác     | Nâng tooling tách khỏi runtime (6.1), đọc migration notes, không tắt test                    |
| `npm audit` thay đổi theo registry sau approval   | Candidate bị block bởi advisory mới | Pin lockfile, ghi timestamp/evidence; remediation hoặc revised plan, không ignore âm thầm    |
| esbuild transitive đổi version, `allowScripts` cũ | `npm ci` fail hoặc script bị chặn   | Rà `allowScripts` trong bước 3, đưa vào checklist handoff                                    |
| License thật của một package ngoài allowlist      | Gate mới fail trên tree hiện có     | Chạy script trên tree thật trước khi thêm vào CI; bổ sung allowlist có ghi chú trong handoff |
| Nâng vite/postcss làm build output khác           | Regression khó thấy ở production    | So sánh build pass + smoke test hiện có; thay đổi chỉ trong patch minor line                 |

## 14. Rollback plan

- Rollback dependency: khôi phục đồng thời `package.json` và
  `package-lock.json` về exact prior snapshot; không giữ lockfile lai.
- Rollback CI: revert `ci.yml` về trước khi thêm step; chỉ làm khi
  dependency tương ứng cũng rollback — không tắt gate để đưa candidate lỗi
  qua release.
- Xoá `scripts/check-licenses.ts` cùng commit rollback CI.
- Không có database rollback vì không có migration/schema change.

## 15. Acceptance criteria

- [ ] `react-router-dom@6.30.4`, `vite@6.4.3`, `postcss@8.5.19`,
      `vitest@3.2.7` (hoặc patch mới hơn trong cùng dòng đã duyệt, ghi trong
      handoff) được pin exact.
- [ ] `npm audit --audit-level=moderate` exit 0 trên exact candidate
      lockfile.
- [ ] `npm run check:licenses` tồn tại, pass trên tree thật và có negative
      test chứng minh fail đúng cách.
- [ ] CI chạy format:check + audit + license check + toàn bộ gate cũ, xanh
      trên candidate commit.
- [ ] Toàn bộ 87 test pass trên Vitest 3; build pass; không tắt/skip test,
      không dùng `npm audit fix --force`.
- [ ] `allowScripts` khớp với esbuild version thực tế trong lockfile.
- [ ] Handoff FEATURE-013 đầy đủ với Evidence Binding; fresh Gemini và
      fresh Codex adversarial review không còn finding chưa xử lý.
- [ ] Người dùng phê duyệt release cuối; không agent nào tự merge/deploy
      ngoài quyền được cấp.
