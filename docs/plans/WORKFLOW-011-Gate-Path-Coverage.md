# WORKFLOW-011: Phân loại có chủ đích 24 đường dẫn đang rơi vào fail-closed

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-26)
- Approved by / date:
- Risk tier: ELEVATED
- Risk categories and escalation rationale: governance-enforcement tooling —
  sửa `scripts/gates-manifest.ts` là sửa logic quyết định gate nào chạy cho
  thay đổi nào, cùng lớp rủi ro với WORKFLOW-004C (classifier TRIVIAL) và
  WORKFLOW-007. Không sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`,
  không đụng CI/deploy, nên không CRITICAL.
- **Yêu cầu riêng theo `AGENTS.md` mục 6:** một phần thay đổi này **thu hẹp**
  phạm vi gate cho vài đường dẫn. Mục 6 đòi phê duyệt rõ ràng của con người kèm
  deviation ghi lại, và không envelope nào cấp được quyền đó. Danh sách chính
  xác các đường dẫn bị thu hẹp nằm ở Nhóm C bên dưới — duyệt plan này là duyệt
  đúng danh sách đó, không phải duyệt chung chung.
- Change type and required gate profile: toolchain (`scripts/**` + test) —
  profile `full`.

## Objective and scope

- Objective: 24/233 file tracked hiện không khớp rule nào trong
  `PATH_GATE_RULES`, chỉ được bảo vệ nhờ nhánh fail-closed
  `'unrecognized path; fail closed to full'`. Phân loại chúng có chủ đích, và
  thêm test để khoảng trống này không âm thầm mọc lại.
- In scope: `scripts/gates-manifest.ts`, `tests/scripts/gates-manifest.test.ts`.
- Out of scope: đổi định nghĩa profile (`WEB_/DOCS_/BROWSER_/FULL_PROFILE_GATE_IDS`);
  đụng `classify-change.ts` hay cơ chế fail-closed — fail-closed **phải giữ
  nguyên** làm lưới an toàn cuối; WORKFLOW-009 (PR #33, file rời nhau, chạy
  song song được).

## Current analysis and design

Hiện trạng **không có gì bị dưới-kiểm**: fail-closed cho chạy _nhiều_ gate hơn
mức cần. Vấn đề là chưa ai **quyết định** những đường dẫn này thuộc profile nào,
nên an toàn đang dựa vào cơ chế dự phòng chứ không dựa vào chủ đích — và mọi sửa
đổi nhỏ ở các đường dẫn đó đều kéo cả 15 gate.

Đáng chú ý nhất là những thứ lẽ ra phải được phân loại tường minh:

| Đường dẫn                                                           | Vì sao đáng phân loại tường minh                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `supabase/migrations/**`, `supabase/rollbacks/**`                   | Migration — Risk Model rule 5 xếp ít nhất ELEVATED; classifier không có khái niệm này |
| `docs/security/audit-allowlist.json`                                | Thêm một dòng ở đây là triệt tiêu một finding `npm audit` — security control          |
| `scripts/cli.ts`, `check-audit.ts`, `check-branch-context-drift.ts` | Toolchain/gate script nằm ngoài rule toolchain; `cli.ts` được 8 script khác import    |

### Phân nhóm đề xuất

**Nhóm A — giữ nguyên `full`, chỉ viết rule cho tường minh. Không đổi hành vi.**
`supabase/migrations/**`, `supabase/rollbacks/**`, `docs/security/audit-allowlist.json`,
`scripts/cli.ts`, `scripts/check-audit.ts`, `scripts/check-branch-context-drift.ts`,
`postcss.config.js`, `tailwind.config.js`, `.prettierrc.json`, `.env.example`,
`.gitignore`, `.codex/config.toml`, `docs/trace/trivial/.gitkeep`.

**Nhóm B — chuyển sang `web`.** `tests/hooks/**`, `tests/security/**`,
`tests/fixtures/check-licenses/**` — đều là test/fixture của mã ứng dụng và
script, đúng lớp mà rule tests hiện có đã phủ cho `tests/{components,lib,routes,store}`.

**Nhóm C — chuyển sang `docs`. Đây là phần THU HẸP gate, cần bạn duyệt đích danh:**
`CHANGELOG.md`, `PROJECT_STORY.md`, `CLAUDE.md`,
`.claude/skills/feature-delivery/SKILL.md`.

Bốn file này là markdown thuần, không có mã, và `check-docs` đã kiểm link/đường
dẫn/lệnh `npm run` trong đó. `CLAUDE.md` hiện chỉ còn một dòng `@AGENTS.md`;
`AGENTS.md` bản thân nó vẫn ở rule docs sẵn có. Lưu ý: TRIVIAL vẫn bị cấm cho
`CLAUDE.md` và skill theo architecture — plan này không đụng chính sách TRIVIAL.

### Chống mọc lại

Thêm test vào `tests/scripts/gates-manifest.test.ts`: liệt kê `git ls-files`,
đối chiếu với `PATH_GATE_RULES`, và khẳng định tập không-khớp bằng đúng một
allowlist ngoại lệ được ghi rõ trong test. File mới không khớp rule nào sẽ làm
đỏ test, buộc người thêm file phải quyết định phân loại — thay vì im lặng rơi
vào fail-closed. Fail-closed vẫn giữ làm lưới an toàn cuối.

- New technology: không có.
- Execution profile + degradation path: Implementer cần repo-rw + shell + test.
  Nếu `tsx` bị EPERM không chạy được `npm test` (hạn chế đã biết của profile
  `codex-claude-subagent`), báo rõ và để orchestrator chạy gate/evidence —
  không được tự khai gate pass.

## Delivery plan

Execution assignment — mỗi dòng cần xác nhận riêng khi đến lượt vai đó:

| Vai trò              | Agent đề xuất                | Model / effort | Lý do                                                                                                             | Đã xác nhận                                |
| -------------------- | ---------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Planner              | Claude Code                  | high           | Đã đo tập không-khớp bằng chính `PATH_GATE_RULES` và phân nhóm theo rủi ro.                                       | tuann2, 2026-07-26 (dispatch "ok soạn đi") |
| Implementer          | Codex (`codex:codex-rescue`) | high           | Không tự nhận: đây là `scripts/**` + test, đúng loại "substantial" mà Responsibility Matrix cấm Planner tự làm.   | chưa                                       |
| Independent Reviewer | Codex fresh (`--fresh`)      | high           | ELEVATED cần một reviewer tươi đọc từng dòng; cần đọc được logic regex + chạy test, nên ưu tiên profile có shell. | chưa                                       |
| Release Assessor     | Claude Code                  | low            | Khác Implementer.                                                                                                 | chưa                                       |

1. Thêm rule cho Nhóm A và B vào `PATH_GATE_RULES`, giữ nguyên thứ tự ưu tiên
   hiện có (rule đứng trước thắng).
2. Thêm rule Nhóm C sau khi tuann2 duyệt đích danh danh sách 4 file.
3. Thêm test chống mọc lại + test cho từng nhóm mới.
4. Chạy `npm run gates -- --changed-from=<base_sha>` và `npm run evidence`,
   viết handoff. Kiểm chứng cuối: chạy lại phép đo tập không-khớp và xác nhận
   nó chỉ còn đúng allowlist đã ghi.

## Risks and controls

| Risk                                                     | Impact                                      | Mitigation                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Rule mới quá rộng, nuốt đường dẫn đáng lẽ phải chạy full | Thay đổi rủi ro cao lọt qua với ít gate hơn | Rule neo `^...$` hoặc tiền tố thư mục hẹp; test khẳng định từng nhóm map đúng profile; reviewer đọc từng regex.       |
| Thứ tự rule làm rule cũ bị che                           | Đường dẫn đang đúng bị phân loại sai        | Rule đầu tiên khớp sẽ thắng — test hiện có đã khoá hành vi của các rule cũ; không đổi thứ tự rule cũ.                 |
| Test chống mọc lại gây phiền khi thêm file mới           | Người ta xoá test cho nhanh                 | Test chỉ đòi thêm một dòng vào allowlist hoặc viết rule — thông báo lỗi phải nói rõ hai lựa chọn đó.                  |
| Thu hẹp gate cho Nhóm C bỏ sót rủi ro                    | Sửa 4 file đó chỉ còn chạy gate docs        | Cả 4 là markdown không chứa mã; `check-docs` vẫn kiểm link/path/lệnh; fail-closed vẫn giữ cho mọi thứ chưa phân loại. |

## Acceptance and recovery

- [ ] `PATH_GATE_RULES` phủ hết 24 đường dẫn, trừ những mục cố ý để trong
      allowlist ngoại lệ của test.
- [ ] Nhóm A vẫn ra profile `full` — chứng minh bằng test, không đổi hành vi.
- [ ] Nhóm B ra `web`, Nhóm C ra `docs`.
- [ ] Test chống mọc lại tồn tại và đỏ khi thêm một đường dẫn chưa phân loại.
- [ ] Cơ chế fail-closed trong `classify-change.ts` không bị đụng tới.
- [ ] Handoff ghi kết quả phép đo tập không-khớp trước và sau.
- Security considerations: không đụng auth, secret, dependency, CI/deploy. Thay
  đổi ảnh hưởng phạm vi gate — xem yêu cầu `AGENTS.md` mục 6 ở mục Status.
- API/database impact: không.
- Test strategy: test đơn vị cho từng nhóm + test chống mọc lại; profile `full`
  chạy đủ vì thay đổi nằm ở `scripts/**`.
- Rollback plan: một commit → `git revert <sha>`; fail-closed vẫn còn nguyên nên
  revert đưa về đúng hành vi an toàn hiện tại.
