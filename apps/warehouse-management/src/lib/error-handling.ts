/**
 * Serialize an error for logging (Error objects don't JSON.stringify properly)
 */
export function serializeError(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }
  return { message: String(error) };
}

/**
 * Map database constraint errors to user-friendly Vietnamese messages
 */
export function getDbErrorMessage(error: unknown, defaultMessage: string): string {
  if (!(error instanceof Error)) return defaultMessage;

  const msg = error.message.toLowerCase();

  // Unique constraint violations
  if (msg.includes('unique constraint') || msg.includes('duplicate key')) {
    if (msg.includes('receipt_number')) return 'Số phiếu nhập đã tồn tại trong hệ thống';
    if (msg.includes('email')) return 'Email đã tồn tại trong hệ thống';
    if (msg.includes('name')) return 'Tên này đã tồn tại trong hệ thống';
    if (msg.includes('code')) return 'Mã này đã tồn tại trong hệ thống';
    return 'Bản ghi này đã tồn tại trong hệ thống';
  }

  // Foreign key violations
  if (msg.includes('foreign key') || msg.includes('violates foreign key constraint')) {
    if (msg.includes('delete') || msg.includes('referenced')) {
      return 'Không thể xóa vì có dữ liệu liên quan';
    }
    return 'Dữ liệu liên quan không tồn tại';
  }

  // Not null violations
  if (msg.includes('not-null constraint') || msg.includes('null value')) {
    return 'Thiếu thông tin bắt buộc';
  }

  // Check constraint violations
  if (msg.includes('check constraint')) {
    return 'Dữ liệu không hợp lệ';
  }

  // Connection/timeout errors
  if (msg.includes('connection') || msg.includes('timeout')) {
    return 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.';
  }

  // Default: don't expose raw message
  return defaultMessage;
}
