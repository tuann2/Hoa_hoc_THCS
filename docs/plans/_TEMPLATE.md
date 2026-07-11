# <FEATURE-ID>: <Tên tính năng>

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by:
- Approved date:
- Risk tier: <!-- NORMAL | ELEVATED | CRITICAL, per the architecture's Risk Model -->
- Risk categories: <!-- applicable categories, e.g. "numeric business logic", "public API"; "none" if NORMAL -->
- Escalation rationale: <!-- why this tier; "n/a" if lowest plausible tier -->
- Change type: <!-- per the architecture's quality-gates table: Documentation only | Learning content or content schema | Application source or runtime config | Tests only | Dependencies or lockfiles | Public API or complex/numeric logic | Auth, security or permissions | Migration or destructive operation | Infrastructure or deployment -->
- Quality gates: <!-- canonical commands required for this change type, per the architecture's Validation Model; a required gate with no repository command is a blocker, not permission to skip -->

## 1. Objective

Mô tả kết quả cần đạt.

## 2. Current system analysis

Mô tả trạng thái hiện tại của codebase.

## 3. Assumptions

- Assumption 1
- Assumption 2

## 4. Scope

- Nội dung trong phạm vi triển khai.

## 5. Out of scope

- Nội dung không được triển khai.

## 6. Proposed design

Mô tả kiến trúc và hướng triển khai.

## 6a. New technology (bỏ qua nếu không áp dụng)

Chỉ điền nếu kế hoạch thêm dependency, service hoặc infra mới.

- Công nghệ đề xuất:
- Lý do lựa chọn:
- Phương án khác đã xem xét và lý do loại:
- Trade-off chấp nhận (chi phí, độ phức tạp, lock-in, bảo mật, bảo trì):
- **Cần con người duyệt lựa chọn này trước khi triển khai.**
- Sau khi duyệt: cập nhật `docs/architecture.md` (và `docs/adr/` nếu là
  quyết định không tầm thường).

## 7. Files to create

- `path/to/new-file`

## 8. Files to modify

- `path/to/existing-file`

## 9. API and database impact

Mô tả thay đổi API, schema hoặc migration.

## 10. Implementation steps

1. Bước 1
2. Bước 2
3. Bước 3

## 11. Test strategy

- Unit tests
- Integration tests
- Regression tests
- Negative cases

## 12. Security considerations

Mô tả rủi ro bảo mật và biện pháp kiểm soát.

## 13. Risks

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| ...  | ...    | ...        |

## 14. Rollback plan

Mô tả cách rollback an toàn.

## 15. Acceptance criteria

- [ ] Điều kiện 1
- [ ] Điều kiện 2
- [ ] Điều kiện 3
