const config = window.DAMGA_CONFIG || {};

let customerPhone = null;
let currentStamps = 0;

const $ = (id) => document.getElementById(id);

function showMessage(element, text, type = "") {
    element.textContent = text;
    element.className = "message " + type;
}

function normalizePhone(value) {
    let phone = value.replace(/\D/g, "");

    if (phone.startsWith("90") && phone.length === 12) {
        phone = "0" + phone.substring(2);
    }

    if (phone.length === 10 && phone.startsWith("5")) {
        phone = "0" + phone;
    }

    return phone;
}

function validPhone(phone) {
    return /^05\d{9}$/.test(phone);
}

function renderStamps(count) {
    const stamps = $("stamps");
    stamps.innerHTML = "";

    for (let i = 1; i <= 10; i++) {
        const stamp = document.createElement("div");
        stamp.className = "stamp";

        if (i <= count) {
            stamp.classList.add("filled");
            stamp.textContent = "✓";
        } else {
            stamp.textContent = i;
        }

        stamps.appendChild(stamp);
    }

    $("count").textContent = `${count} / 10 Damga`;
}

async function supabaseRPC(functionName, params) {
    const response = await fetch(
        `${config.SUPABASE_URL}/rest/v1/rpc/${functionName}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": config.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${config.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(params)
        }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            "İşlem başarısız."
        );
    }

    return data;
}


// TELEFON NUMARASIYLA KARTI AÇ

$("phoneForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = normalizePhone($("phone").value);

    if (!validPhone(phone)) {
        showMessage(
            $("message"),
            "Geçerli bir telefon numarası girin.",
            "error"
        );
        return;
    }

    showMessage($("message"), "Kart açılıyor...");

    try {
        const data = await supabaseRPC(
            "get_customer",
            {
                p_phone: phone
            }
        );

        const customer = Array.isArray(data)
            ? data[0]
            : data;

        customerPhone = phone;
        currentStamps = Number(customer?.stamps || 0);

        $("customerCard").classList.remove("hidden");
        $("customerPhone").textContent = phone;

        renderStamps(currentStamps);

        showMessage($("message"), "");

        showMessage(
            $("result"),
            "Kartınız açıldı.",
            "success"
        );

    } catch (error) {
        showMessage(
            $("message"),
            error.message,
            "error"
        );
    }
});


// DAMGA KAZAN BUTONU

$("stampButton").addEventListener("click", () => {
    $("pinBox").classList.remove("hidden");
    $("pin").value = "";
    $("pin").focus();
});


// VAZGEÇ

$("cancelButton").addEventListener("click", () => {
    $("pinBox").classList.add("hidden");
});


// ŞİFREYİ ONAYLA VE DAMGA EKLE

$("confirmButton").addEventListener("click", async () => {
    const pin = $("pin").value.trim();

    if (!/^\d{4}$/.test(pin)) {
        showMessage(
            $("result"),
            "4 haneli şifreyi girin.",
            "error"
        );
        return;
    }

    $("confirmButton").disabled = true;

    try {
        const data = await supabaseRPC(
            "add_stamp",
            {
                p_phone: customerPhone,
                p_pin: pin
            }
        );

        currentStamps = Number(data);

        renderStamps(currentStamps);

        $("pinBox").classList.add("hidden");

        if (currentStamps >= 10) {
            showMessage(
                $("result"),
                "🎉 Tebrikler! 10 damgaya ulaştınız.",
                "success"
            );
        } else {
            showMessage(
                $("result"),
                "✓ Damganız başarıyla eklendi.",
                "success"
            );
        }

    } catch (error) {
        showMessage(
            $("result"),
            error.message,
            "error"
        );
    }

    $("confirmButton").disabled = false;
});
