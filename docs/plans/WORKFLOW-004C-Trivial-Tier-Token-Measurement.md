# WORKFLOW-004C: TRIVIAL tier enforcement & token measurement

## Status

- Status: DRAFT
- Owner: Claude Code
- Approved by:
- Approved date:
- Risk tier: ELEVATED
- Risk categories: governance-enforcement tooling (scripts); risk-tier
  classification logic
- Escalation rationale: Không sửa architecture (policy TRIVIAL đã
  APPROVED trong v2.4/004B) và không đổi CI/deploy controls, nhưng
  classifier sai có thể cho thay đổi lọt review ⇒ complex logic ảnh
  hưởng kiểm soát ⇒ ELEVATED. Nếu khi implement phát sinh nhu cầu sửa
  policy/architecture ⇒ dừng, leo CRITICAL theo rule 2.
- Change type: Application source or runtime config (scripts) +
  Documentation only
- Quality gates: theo classifier 004A trên changed paths (dự kiến:
  baseline + lint + typecheck + unit + docs-check); toàn bộ tests trên
  candidate pass.
- Phụ thuộc: 004A + 004B merged; architecture v2.4 APPROVED.

## 1. Objective

1. Enforce tier TRIVIAL bằng máy: classifier fail-closed quyết định một
   diff có đủ điều kiện TRIVIAL không; con người/agent không tự phán.
2. Micro-trace: TRIVIAL bỏ plan/handoff đầy đủ nhưng để lại vết
   snapshot-bound kiểm toán được.
3. Đo lường thật hiệu quả token của 004B: baseline trước/sau trên bộ
   scenario cố định, làm bằng chứng giữ/nới CONTEXT_RULES.

## 2. Current system analysis

- Sau 004B: TRIVIAL tồn tại trong Risk Model v2.4 dạng policy
  (allowlist/denylist/hard triggers) nhưng chưa có gì enforce; agent
  phải tự đọc-hiểu ⇒ rủi ro diễn giải rộng.
- `classify-change.ts` (004A) đã map path→gates nhưng chưa map
  path→risk-tier eligibility.
- Chưa có số đo token nào ngoài ước lượng tay khi soạn 004B.

## 3. Assumptions

- Policy TRIVIAL v2.4 đứng yên trong suốt plan này (thay đổi policy ⇒
  ngoài scope, mở amendment riêng).
- Micro-trace lưu trong repo được chấp nhận (thư mục
  `docs/trace/trivial/`, file nhỏ, append-only) — nếu Owner muốn nơi
  khác (PR description), quyết tại approve.

## 4. Scope

- `scripts/classify-trivial.ts`: input diff/changed paths ⇒ verdict
  `TRIVIAL | ESCALATE(NORMAL+) + lý do từng path/trigger`. Thuần data +
  hàm pure, tái dùng manifest/classifier 004A. Fail-closed: path lạ,
  file add/delete/rename, hoặc bất kỳ hard trigger ⇒ ESCALATE.
- Tích hợp: `gates.ts` nhận `--tier=trivial` — chạy classify-trivial
  trước; verdict ESCALATE ⇒ exit ≠ 0 kèm hướng dẫn mở plan NORMAL.
- Micro-trace: `npm run trace:trivial` sinh file
  `docs/trace/trivial/<UTCdate>-<short-sha>.yaml`:

  ```yaml
  request_class: change
  risk_tier: TRIVIAL
  base_sha: ...
  validated_snapshot: {kind: ..., id: ...}   # từ evidence.ts
  changed_paths: [...]
  selected_gates: [...]
  result: PASS
  timestamp_utc: ...
  ```

- CI: PR được tuyên bố TRIVIAL (label hoặc file trace hiện diện) thì CI
  chạy thêm bước xác nhận verdict — verdict máy ≠ TRIVIAL ⇒ CI fail
  (chống khai gian tier).
- Đo token: script/quy trình chạy 8 scenario chuẩn (từ conformance
  004B + 2 scenario TRIVIAL) trước và sau khi bật routing; ghi
  `docs/measurements/WORKFLOW-004-token-baseline.md`: mandatory files,
  bytes, lines, observed input tokens (nếu runtime báo), thời gian.
  Một vòng đo, mỗi scenario chạy 2 lần lấy trung bình — không benchmark
  p50/p95 nhiều vòng (HIGH-07 Modified).
- Cập nhật `docs/CONTEXT_RULES.md` và shim: 1–2 dòng trỏ lệnh
  `gates --tier=trivial` + `trace:trivial`.

## 5. Out of scope

- Sửa policy TRIVIAL / architecture (⇒ amendment riêng, CRITICAL).
- Nới allowlist cho `content/units/*.json` — chỉ xem xét sau ≥ 1 tháng
  vận hành với dữ liệu từ measurement, bằng plan riêng định nghĩa rule
  field-level máy kiểm được (vd. chỉ sửa trường `explanation` prose,
  không đụng `answer`/`options`/giá trị số).
- CI/deploy ngoài bước xác nhận verdict.
- Tự động gán label/tier trong GitHub (thủ công là đủ ở quy mô này).

## 6. Proposed design

Verdict logic (thứ tự, dừng ở rule khớp đầu tiên):

1. Path khớp hard denylist (v2.4) ⇒ ESCALATE.
2. File add/delete/rename ⇒ ESCALATE.
3. Path ngoài allowlist ⇒ ESCALATE.
4. Diff nội dung chạm hard trigger máy-kiểm-được (đổi dòng chứa
   `npm run`, path tham chiếu, code fence, số liệu trong docs kỹ
   thuật) ⇒ ESCALATE. Trigger không máy-kiểm-được (đổi "nghĩa giáo
   dục") được phòng bởi allowlist hẹp sẵn (chỉ docs prose
   phi-governance) — ghi rõ giới hạn này trong output.
5. Còn lại ⇒ TRIVIAL, gates tối thiểu: `git-diff-check`,
   `format-check`, `docs-check`.

Không dùng LLM trong classifier — thuần rule, deterministic, test được.

## 6a. New technology

Không có.

## 7. Files to create

- `scripts/classify-trivial.ts` + tests
- `scripts/trace-trivial.ts` (hoặc gộp vào gates.ts — quyết khi
  implement, ghi lựa chọn vào handoff)
- `docs/trace/trivial/.gitkeep`
- `docs/measurements/WORKFLOW-004-token-baseline.md`

## 8. Files to modify

- `scripts/gates.ts` (cờ `--tier=trivial`)
- `scripts/gates-manifest.ts` (nếu cần khai profile trivial)
- `.github/workflows/ci.yml` (bước xác nhận verdict cho PR TRIVIAL)
- `docs/CONTEXT_RULES.md`, `AGENTS.md` (1–2 dòng trỏ lệnh)
- `package.json` (scripts `trace:trivial`)

## 9. API and database impact

Không có.

## 10. Implementation steps

1. Stage 0 — verify HEAD; xác nhận v2.4 APPROVED; chép nguyên văn
   allowlist/denylist/triggers từ v2.4 vào fixtures test (nguồn duy
   nhất là architecture — test import từ một module hằng số, không chép
   tay 2 nơi).
2. Implement classifier thuần + tests (bảng case §11).
3. Tích hợp gates.ts + micro-trace + bước CI xác nhận verdict.
4. Chạy đo token 8 scenario, ghi baseline report.
5. Pilot: 2 thay đổi TRIVIAL thật (docs typo) đi trọn đường mới; 1 thay
   đổi cố tình vi phạm (sửa lệnh trong docs) phải bị ESCALATE — ghi cả
   ba vào handoff.
6. Independent review ELEVATED: fresh reviewer đọc mọi changed line,
   tập trung tìm đường lách classifier (path trick, rename ngụy trang,
   symlink, case-sensitivity, unicode path).
7. Release-readiness → human approve → merge.

## 11. Test strategy

- Unit classifier, tối thiểu các case: docs prose hợp lệ (TRIVIAL);
  file trong denylist (ESCALATE); path lạ (ESCALATE); thêm file mới dù
  là .md (ESCALATE); rename (ESCALATE); sửa dòng chứa `npm run` trong
  docs (ESCALATE); sửa content unit (ESCALATE vì ngoài allowlist);
  đổi số trong bảng kỹ thuật (ESCALATE); mix 1 path hợp lệ + 1 vi phạm
  (ESCALATE toàn bộ); path unicode/hoa-thường bất thường (fail-closed).
- Test verdict-CI: PR giả TRIVIAL chứa vi phạm ⇒ CI fail (fixture trên
  nhánh thử).
- Micro-trace: snapshot id khớp evidence.ts; trace thiếu trường ⇒
  invalid.
- Đo token: report đủ 8 scenario × trước/sau, có cột deviation vs
  target (read-only ≤1.5k, TRIVIAL ≤2.5k, NORMAL ≤5k).
- Regression: toàn bộ tests trên candidate pass (số thực tế từ CI).

## 12. Security considerations

- Classifier deterministic, fail-closed, không input tự do vào shell.
- Bước CI xác nhận verdict chống khai gian tier — kiểm soát chính của
  plan; adversarial focus của review đặt tại đây.
- Trace append-only, không chứa nội dung nhạy cảm (chỉ path + SHA).

## 13. Risks

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Classifier có đường lách | Thay đổi rủi ro lọt review | Fail-closed nhiều lớp; review adversarial nhắm lách; mọi TRIVIAL vẫn qua CI đầy đủ của PR |
| Hằng số policy lệch với v2.4 | Enforce sai luật | Một module hằng số duy nhất + test đối chiếu chuỗi với architecture |
| TRIVIAL quá hẹp, ít giá trị thực | Không ai dùng | Chấp nhận đợt đầu; dữ liệu measurement quyết định nới (plan riêng) |
| Số đo token không so sánh được giữa runtimes | Kết luận sai | Cố định scenario + đo bytes/files làm chuẩn chính, tokens quan sát là phụ |

## 14. Rollback plan

Revert 1 merge commit: mất classifier/trace/measurement, TRIVIAL quay
về trạng thái "policy có, enforce chưa" của v2.4 — không ảnh hưởng gate
nào khác. Không data ngoài git.

## 15. Acceptance criteria

- [ ] Verdict TRIVIAL do máy quyết; mọi case bảng §11 pass.
- [ ] Governance/CI/scripts/deps/src/tests/schema/auth và content
      answers không thể vào TRIVIAL (test chứng minh).
- [ ] Path lạ / add / delete / rename ⇒ fail-closed.
- [ ] PR khai TRIVIAL sai bị CI chặn (fixture chứng minh).
- [ ] Mỗi TRIVIAL để lại micro-trace snapshot-bound hợp lệ.
- [ ] Pilot: 2 TRIVIAL thật đi trọn đường; 1 vi phạm bị chặn — ghi
      handoff.
- [ ] Baseline token report đủ 8 scenario trước/sau, đối chiếu target,
      deviation có giải trình.
- [ ] Toàn bộ tests trên candidate pass (số thực tế từ CI cuối).
- [ ] Independent review ELEVATED hoàn tất; human approve merge.
