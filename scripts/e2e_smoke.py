"""Smoke-test запущенного Docker-стека без сторонних Python-зависимостей."""
import json
import os
import time
from urllib.request import Request, urlopen

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8001")


def request(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = Request(BASE_URL + path, data=data, method=method, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=10) as response:
        return json.load(response)


health = request("/health")
assert health["status"] == "ok"
products = request("/products")
assert products, "Каталог пуст"
company = {
    "company_name": "ООО Ромашка",
    "inn": "7701234567",
    "revenue": 24_000_000,
    "age_years": 7,
}
recommendations = request("/recommendations", "POST", {
    **company, "amount": 2_000_000, "term_months": 24, "purpose": "Пополнение оборотных средств",
})
assert recommendations["items"], "Рекомендации не найдены"
created = request("/applications", "POST", {
    **company, "product_id": products[0]["id"], "amount": 2_000_000,
    "term_months": 24, "purpose": "Пополнение оборотных средств",
})
application_id = created["id"]
for _ in range(30):
    current = request(f"/applications/{application_id}")
    print(f"Заявка {application_id}: {current['status']}")
    if current["status"] == "signing":
        break
    assert current["status"] not in ("rejected", "clarification"), current["decision_comment"]
    time.sleep(1)
else:
    raise TimeoutError("Заявка не дошла до подписания")
issued = request(f"/applications/{application_id}/sign", "POST")
assert issued["status"] == "issued"
assert issued["offer_rate"] is not None
saved = request("/applications?inn=7701234567")
assert any(item["id"] == application_id for item in saved)
print(f"OK: заявка {application_id} сохранена, одобрена, подписана и выдана (симуляция).")
