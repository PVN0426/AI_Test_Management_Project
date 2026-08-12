import json
import logging
from django.conf import settings
from apps.ai.models import AIJob

logger = logging.getLogger(__name__)


class AIService:
    @staticmethod
    def generate_test_cases(requirements_text, tenant=None, preferred_model=None):
        provider = getattr(settings, 'AI_PROVIDER', 'stub')

        if provider == 'stub':
            mock_output = {
                "test_cases": [
                    {
                        "case_id": "TC_001",
                        "title": "Kiểm tra đăng nhập thành công (Docker Stub)",
                        "precondition": "Đã có tài khoản hợp lệ",
                        "priority": "high",
                        "steps": [
                            {"order": 1, "action": "Nhập username/password", "expected": "Hệ thống chấp nhận"},
                            {"order": 2, "action": "Nhấn Đăng nhập", "expected": "Vào trang Dashboard"}
                        ]
                    }
                ]
            }
            job = AIJob.objects.create(
                tenant=tenant,
                kind="generate_tc",
                status="SUCCESS",
                tokens=100,
                cost_usd=0.0,
                output_json=mock_output,
                raw_output=json.dumps(mock_output)
            )
            return job, mock_output

        elif provider == 'gemini':
            from google import genai

            api_key = getattr(settings, 'GEMINI_API_KEY', '')
            if not api_key:
                raise ValueError("Chưa cấu hình GEMINI_API_KEY trong file .env!")

            client = genai.Client(api_key=api_key)

            # PROMPT 
            system_instruction = (
                "Bạn là một Chuyên gia QA/QC phần mềm Senior.\n"
                "Hãy phân tích kỹ Yêu cầu phần mềm (Requirement) và sinh ra danh sách Test Case dạng JSON có độ phủ tối đa (Full Coverage).\n"
                "BẮT BỘC phải quét qua đầy đủ các kịch bản:\n"
                "1. Luồng chạy thành công chính (Happy path / Positive cases)\n"
                "2. Luồng thất bại & Xử lý lỗi (Negative cases / Validation errors)\n"
                "3. Ràng buộc dữ liệu & Giá trị biên (Boundary values)\n"
                "4. Phân quyền & Trạng thái hệ thống (Authorization / State transitions)\n"
                "5. Các trường hợp ngoại lệ (Edge cases)\n\n"
                "TUYỆT ĐỐI KHÔNG giới hạn ở 5 test case. Hãy sinh ĐẦY ĐỦ số lượng test case cần thiết "
                "(từ 8 đến 15+ test cases tùy thuộc vào độ phức tạp của Requirement) để bảo đảm không bỏ sót kịch bản nào."
            )

            prompt = f"Requirement chi tiết:\n{requirements_text}\n\nHãy phân tích và tạo danh sách Test Case chi tiết và đầy đủ nhất."

            response_schema = {
                "type": "OBJECT",
                "properties": {
                    "test_cases": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "case_id": {
                                    "type": "STRING",
                                    "description": "Mã định danh Test Case do AI tự đặt, ví dụ: TC_001, TC_002, TC_003..."
                                },
                                "title": {"type": "STRING"},
                                "precondition": {"type": "STRING"},
                                "priority": {"type": "STRING"},
                                "steps": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "order": {"type": "INTEGER"},
                                            "action": {"type": "STRING"},
                                            "expected": {"type": "STRING"}
                                        },
                                        "required": ["order", "action", "expected"]
                                    }
                                }
                            },
                            "required": ["case_id", "title", "priority", "steps"]
                        }
                    }
                },
                "required": ["test_cases"]
            }

            env_model = getattr(settings, 'GEMINI_MODEL', None)
            candidate_models = []
            if preferred_model:
                candidate_models.append(preferred_model)
            if env_model and env_model not in candidate_models:
                candidate_models.append(env_model)

            default_models = ['gemini-3.6-flash']
            for m in default_models:
                if m not in candidate_models:
                    candidate_models.append(m)

            last_exception = None

            for model_name in candidate_models:
                try:
                    logger.info("Generating test cases with Gemini model %s", model_name)
                    interaction = client.interactions.create(
                        model=model_name,
                        input=prompt,
                        system_instruction=system_instruction,
                        response_format=[
                            {
                                "type": "text",
                                "mime_type": "application/json",
                                "schema": response_schema,
                            }
                        ],
                    )

                    raw_content = interaction.output_text
                    if not raw_content:
                        raise ValueError("Gemini không trả về nội dung JSON.")
                    parsed_json = json.loads(raw_content)
                    if not isinstance(parsed_json, dict) or not isinstance(parsed_json.get("test_cases"), list):
                        raise ValueError("Gemini trả về JSON không đúng schema test_cases.")

                    usage = getattr(interaction, 'usage', None)
                    tokens_used = getattr(usage, 'total_tokens', 0) if usage else 0

                    logger.info("Generated test cases successfully with Gemini model %s", model_name)

                    job = AIJob.objects.create(
                        tenant=tenant,
                        kind="generate_tc",
                        status="SUCCESS",
                        tokens=tokens_used,
                        cost_usd=0.0,
                        output_json=parsed_json,
                        raw_output=f"[Model: {model_name}] {raw_content}"
                    )
                    return job, parsed_json

                except Exception as e:
                    last_exception = e
                    logger.warning("Gemini model %s failed: %s", model_name, e)
                    continue

            job = AIJob.objects.create(
                tenant=tenant,
                kind="generate_tc",
                status="FAILED",
                raw_output=f"Tất cả model đều thất bại. Lỗi cuối: {str(last_exception)}"
            )
            raise last_exception

        raise ValueError(f"AI_PROVIDER không được hỗ trợ: {provider}")
