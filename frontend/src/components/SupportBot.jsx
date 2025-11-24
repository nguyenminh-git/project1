import { useState } from 'react'

/**
 * Danh sách FAQ mở rộng
 * - Mỗi entry có: keywords (mảng từ khoá) + answer (câu trả lời)
 * - Bot sẽ chọn câu có số keyword khớp nhiều nhất.
 */
const cannedFaq = [
  // ===== ĐĂNG BÀI / SỬA / XÓA =====
  {
    keywords: ['đăng', 'bài', 'tin', 'rao', 'bán'],
    answer:
      'Để đăng đồ cần nhượng, bạn bấm nút "Đăng đồ cần nhượng" trên trang chủ hoặc vào đường dẫn /posts/new, sau đó điền tiêu đề, giá, mô tả và tải lên hình ảnh rõ nét. Khi kiểm tra xong bạn bấm Đăng. Nếu muốn chỉnh sửa hoặc xoá tin, bạn vào mục Quản lý bài đăng trong tài khoản của mình.',
  },
  {
    keywords: ['sửa', 'chỉnh sửa', 'edit', 'đổi nội dung'],
    answer:
      'Để sửa nội dung một bài đăng, bạn vào trang "Quản lý bài đăng" trong tài khoản, chọn bài cần chỉnh sửa rồi bấm nút "Sửa". Sau khi cập nhật xong, nhớ lưu lại để thay đổi có hiệu lực.',
  },
  {
    keywords: ['xóa', 'xoa', 'xoá', 'delete'],
    answer:
      'Nếu bạn muốn xóa bài, hãy vào mục "Quản lý bài đăng", tìm tới bài đó và dùng nút "Xóa". Một khi đã xóa, bài sẽ không còn hiển thị cho người khác nữa.',
  },

  // ===== QUY ĐỊNH / VI PHẠM / DUYỆT BÀI =====
  {
    keywords: ['quy định', 'quy tac', 'vi phạm', 'vi pham', 'cấm', 'cam'],
    answer:
      'MABU không cho phép đăng sản phẩm bị cấm theo pháp luật, nội dung phản cảm, lừa đảo hoặc spam. Một món đồ chỉ nên đăng một bài, không lặp lại nội dung. Nếu vi phạm nhiều lần, tài khoản có thể bị khoá.',
  },
  {
    keywords: ['duyet', 'duyệt', 'chờ duyệt', 'cho duyet', 'ẩn', 'an bai'],
    answer:
      'Một số bài có thể cần hệ thống hoặc admin kiểm tra nhanh trước khi hiển thị đầy đủ. Nếu bài bị ẩn hoặc chờ duyệt quá lâu, bạn hãy kiểm tra lại tiêu đề, hình ảnh và mô tả xem có nội dung nhạy cảm hoặc trùng lặp không.',
  },

  // ===== PHÍ / CHIẾT KHẤU =====
  {
    keywords: ['phí', 'phi', 'chiết khấu', 'hoa hồng', 'mất phí'],
    answer:
      'Hiện việc đăng và trao đổi đồ cũ trên MABU hoàn toàn miễn phí. Chúng tôi sẽ thông báo rõ ràng trên trang chủ nếu có bất kỳ thay đổi nào về phí dịch vụ trong tương lai.',
  },

  // ===== TÀI KHOẢN / MẬT KHẨU / ĐĂNG NHẬP =====
  {
    keywords: ['tai khoan', 'tài khoản', 'dang ky', 'đăng ký', 'sign up'],
    answer:
      'Bạn có thể đăng ký tài khoản bằng email và tên đăng nhập. Vào trang Đăng ký, điền đầy đủ thông tin, đặt mật khẩu đủ mạnh và hoàn tất là dùng được ngay.',
  },
  {
    keywords: ['dang nhap', 'đăng nhập', 'login'],
    answer:
      'Để đăng nhập, bạn dùng tên đăng nhập hoặc email kèm mật khẩu đã tạo. Nếu không đăng nhập được, hãy kiểm tra lại ký tự đặc biệt hoặc thử đặt lại mật khẩu.',
  },
  {
    keywords: ['quen mat khau', 'quên mật khẩu', 'reset password', 'doi mat khau'],
    answer:
      'Nếu bạn quên mật khẩu, hãy dùng tính năng đặt lại mật khẩu (nếu hệ thống đã hỗ trợ), hoặc liên hệ đội hỗ trợ để được hướng dẫn chi tiết. Nên đặt mật khẩu đủ dài và không dùng chung với tài khoản khác.',
  },

  // ===== AN TOÀN GIAO DỊCH =====
  {
    keywords: ['an toan', 'an toàn', 'lừa đảo', 'lua dao', 'bao mat'],
    answer:
      'Khi giao dịch, bạn nên gặp trực tiếp tại nơi đông người, kiểm tra kỹ hàng trước khi thanh toán. Không chuyển khoản toàn bộ trước khi nhận được hàng và không chia sẻ mật khẩu hoặc mã xác thực cho bất kỳ ai.',
  },

  // ===== BÁO CÁO / FLAG =====
  {
    keywords: ['bao cao', 'báo cáo', 'to cao', 'report'],
    answer:
      'Nếu bạn thấy bài đăng hoặc người dùng có dấu hiệu lừa đảo hoặc vi phạm, hãy dùng nút báo cáo (nếu có) hoặc gửi link bài cho đội hỗ trợ. Hệ thống sẽ xem xét và xử lý phù hợp.',
  },

  // ===== GẶP TRỰC TIẾP / SHIP / THANH TOÁN =====
  {
    keywords: ['ship', 'vận chuyển', 'giao hàng', 'cod'],
    answer:
      'Hiện MABU tập trung hỗ trợ kết nối mua bán giữa sinh viên, chưa cung cấp dịch vụ vận chuyển riêng. Hai bên có thể tự thoả thuận ship, nhưng nên dùng đơn vị uy tín và kiểm tra kỹ thông tin người nhận/gửi.',
  },
  {
    keywords: ['thanh toan', 'thanh toán', 'chuyen khoan', 'chuyển khoản', 'tien mat'],
    answer:
      'MABU không giữ hộ tiền, việc thanh toán là thoả thuận trực tiếp giữa người mua và người bán. Bạn nên cẩn trọng khi chuyển khoản trước, ưu tiên giao dịch trực tiếp hoặc dùng phương thức an toàn.',
  },

  // ===== TÌM KIẾM / LỌC / SẮP XẾP =====
  {
    keywords: ['tim kiem', 'tìm kiếm', 'loc', 'lọc', 'sap xep', 'sắp xếp'],
    answer:
      'Bạn có thể tìm kiếm theo từ khoá, lọc theo danh mục và sắp xếp theo giá ngay trên trang chủ. Nếu muốn tìm đồ miễn phí, hãy bật tuỳ chọn "Chỉ miễn phí" trên thanh công cụ.',
  },

  // ===== LIÊN HỆ / HỖ TRỢ =====
  {
    keywords: ['liên hệ', 'lien he', 'hỗ trợ', 'ho tro', 'support', 'hotline'],
    answer:
      'Bạn có thể liên hệ qua email vungoctuyen2002ksnb@gmail.com hoặc hotline hiển thị ở chân trang để được hỗ trợ. Ngoài ra, mục Hỗ trợ ở footer cũng có hướng dẫn đăng tin và quy định chi tiết.',
  },
]

// Bỏ dấu tiếng Việt + chuẩn hoá
function normalize(str) {
  if (!str) return ''
  let s = str.toLowerCase()

  // Bỏ dấu tiếng Việt (phiên bản gọn, đủ dùng)
  s = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // dấu thanh
    .replace(/đ/g, 'd')

  // Chỉ giữ chữ / số / khoảng trắng
  s = s.replace(/[^a-z0-9\s]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function getBotReply(rawText) {
  const normalized = normalize(rawText)

  // ==== Một vài rule đặc biệt trước (ưu tiên cao) ====

  // Greeting
  if (
    normalized.includes('xin chao') ||
    normalized === 'chao' ||
    normalized.startsWith('chao ') ||
    normalized.includes('hello') ||
    normalized.includes('hi ')
  ) {
    return 'Xin chào! Bạn đang cần trao đổi đồ cũ, hỏi về đăng tin, phí hay quy định nào? Mình sẽ cố gắng trả lời trong phạm vi những câu hỏi phổ biến.'
  }

  // Hỏi trực tiếp "miễn phí không", "có mất phí"
  if (
    normalized.includes('mien phi') ||
    (normalized.includes('mat phi') && normalized.includes('khong'))
  ) {
    return 'Hiện tại việc đăng bài và trao đổi đồ cũ trên MABU là miễn phí. Nếu sau này có thay đổi về phí, hệ thống sẽ thông báo rõ ràng tới người dùng.'
  }

  // ==== Tìm FAQ khớp nhiều keyword nhất ====
  let bestFaq = null
  let bestScore = 0

  for (const faq of cannedFaq) {
    let score = 0
    for (const kw of faq.keywords) {
      const normKw = normalize(kw)
      if (normKw && normalized.includes(normKw)) {
        score += 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestFaq = faq
    }
  }

  // Ít nhất khớp 1 keyword thì trả lời FAQ đó
  if (bestFaq && bestScore > 0) {
    return bestFaq.answer
  }

  // fallback
  return 'Mình đã ghi nhận câu hỏi của bạn. Hiện bot chỉ trả lời được các thắc mắc phổ biến về đăng bài, quy định, phí, an toàn giao dịch và liên hệ hỗ trợ. Nếu cần giải đáp sâu hơn, bạn có thể để lại email hoặc liên hệ qua thông tin ở footer.'
}

export default function SupportBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'Xin chào, mình là MABU Assistant. Bạn muốn hỏi gì về việc trao đổi đồ cũ không?',
    },
  ])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)

  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return

    setMessages((prev) => [...prev, { from: 'user', text }])
    setDraft('')
    setWaiting(true)

    setTimeout(() => {
      const reply = getBotReply(text)
      setMessages((prev) => [...prev, { from: 'bot', text: reply }])
      setWaiting(false)
    }, 400)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <button
        type="button"
        className="bot-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Đóng trợ lý' : 'Chat với MABU'}
      </button>

      {open && (
        <div className="bot-panel">
          <div className="bot-header">
            <div>
              <strong>MABU Assistant</strong>
              <span> Chatbot </span>
            </div>
            <button type="button" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="bot-messages">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.from}-${idx}`}
                className={`bot-bubble ${msg.from}`}
              >
                {msg.text}
              </div>
            ))}
            {waiting && (
              <div className="bot-bubble bot-typing">
                Assistant đang trả lời...
              </div>
            )}
          </div>

          <div className="bot-input">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Hỏi về đăng bài, quy định, phí, an toàn giao dịch..."
              rows={2}
            />
            <button type="button" onClick={sendMessage}>
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
