const config = window.DAMGA_CONFIG || {};

let customerPhone = null;
let currentStamps = 0;
let totalAmount = 0;

const $ = (id) => document.getElementById(id);


// MESAJ GÖSTER
function showMessage(element, text, type = "") {
    element.textContent = text;
    element.className = "message " + type;
}


// TELEFON NUMARASINI DÜZENLE
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


// TELEFON KONTROL
function validPhone(phone) {
    return /^05\d{9}$/.test(phone);
}


// PARA GÖSTERİMİ
function formatMoney(amount) {

    return Number(amount || 0).toLocaleString(
        "tr-TR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ) + " TL";

}


// DAMGALARI GÖSTER
function renderStamps(count) {

    const stamps = $("stamps");

    stamps.innerHTML = "";

    for (let i = 1; i <= 10; i++) {

        const stamp =
            document.createElement("div");

        stamp.className = "stamp";

        if (i <= count) {

            stamp.classList.add("filled");
            stamp.textContent = "✓";

        } else {

            stamp.textContent = i;

        }

        stamps.appendChild(stamp);
    }

    $("count").textContent =
        `${count} / 10 Damga`;
}


// TOPLAM ALIŞVERİŞİ GÖSTER
function renderTotal(amount) {

    totalAmount = Number(amount || 0);

    let totalBox =
        document.getElementById("totalAmount");


    // index.html içinde yoksa otomatik oluştur
    if (!totalBox) {

        totalBox =
            document.createElement("div");

        totalBox.id = "totalAmount";

        totalBox.style.textAlign = "center";
        totalBox.style.marginTop = "12px";
        totalBox.style.marginBottom = "15px";
        totalBox.style.fontSize = "18px";
        totalBox.style.fontWeight = "bold";

        $("count").insertAdjacentElement(
            "afterend",
            totalBox
        );
    }


    totalBox.textContent =
        "Toplam Alışveriş: " +
        formatMoney(totalAmount);
}


// SUPABASE RPC
async function supabaseRPC(functionName, params) {

    const response = await fetch(

        `${config.SUPABASE_URL}/rest/v1/rpc/${functionName}`,

        {
            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "apikey":
                    config.SUPABASE_ANON_KEY,

                "Authorization":
                    `Bearer ${config.SUPABASE_ANON_KEY}`
            },

            body:
                JSON.stringify(params)
        }

    );


    const data =
        await response
            .json()
            .catch(() => null);


    if (!response.ok) {

        throw new Error(
            data?.message ||
            data?.error ||
            "İşlem başarısız."
        );

    }


    return data;
}


// ==========================================
// MÜŞTERİ KARTINI AÇ
// ==========================================

$("phoneForm").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const phone =
            normalizePhone(
                $("phone").value
            );


        if (!validPhone(phone)) {

            showMessage(
                $("message"),
                "Geçerli bir telefon numarası girin.",
                "error"
            );

            return;
        }


        showMessage(
            $("message"),
            "Kart açılıyor..."
        );


        try {

            const data =
                await supabaseRPC(
                    "get_customer",
                    {
                        p_phone: phone
                    }
                );


            const customer =
                Array.isArray(data)
                    ? data[0]
                    : data;


            customerPhone = phone;

            currentStamps =
                Number(
                    customer?.stamps || 0
                );

            totalAmount =
                Number(
                    customer?.total_amount || 0
                );


            $("customerCard")
                .classList
                .remove("hidden");


            $("customerPhone")
                .textContent =
                phone;


            renderStamps(
                currentStamps
            );


            renderTotal(
                totalAmount
            );


            showMessage(
                $("message"),
                ""
            );


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

    }
);


// ==========================================
// DAMGA KAZAN
// ==========================================

$("stampButton").addEventListener(
    "click",
    function() {

        $("pinBox")
            .classList
            .remove("hidden");


        $("pin").value = "";


        $("pin").focus();


        showMessage(
            $("result"),
            ""
        );

    }
);


// ==========================================
// VAZGEÇ
// ==========================================

$("cancelButton").addEventListener(
    "click",
    function() {

        $("pinBox")
            .classList
            .add("hidden");

    }
);


// ==========================================
// ANLIK 4 HANELİ KODU KULLAN
// ==========================================

$("confirmButton").addEventListener(
    "click",
    async function() {

        const code =
            $("pin")
                .value
                .trim();


        if (!/^\d{4}$/.test(code)) {

            showMessage(
                $("result"),
                "4 haneli damga kodunu girin.",
                "error"
            );

            return;
        }


        if (!customerPhone) {

            showMessage(
                $("result"),
                "Önce telefon numaranızla kartınızı açın.",
                "error"
            );

            return;
        }


        $("confirmButton")
            .disabled = true;


        $("confirmButton")
            .textContent =
            "Kontrol ediliyor...";


        try {

            const data =
                await supabaseRPC(
                    "use_stamp_code",
                    {
                        p_phone:
                            customerPhone,

                        p_code:
                            code
                    }
                );


            const result =
                Array.isArray(data)
                    ? data[0]
                    : data;


            currentStamps =
                Number(
                    result?.new_stamps || 0
                );


            const purchaseAmount =
                Number(
                    result?.purchase_amount || 0
                );


            totalAmount =
                Number(
                    result?.total_amount || 0
                );


            renderStamps(
                currentStamps
            );


            renderTotal(
                totalAmount
            );


            $("pinBox")
                .classList
                .add("hidden");


            $("pin").value = "";


            if (currentStamps >= 10) {

                showMessage(
                    $("result"),

                    "🎉 " +
                    formatMoney(purchaseAmount) +
                    " alışveriş kaydedildi. " +
                    "10 damgaya ulaştınız!",

                    "success"
                );

            } else {

                showMessage(
                    $("result"),

                    "✓ " +
                    formatMoney(purchaseAmount) +
                    " alışveriş kaydedildi ve 1 damga eklendi.",

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


        $("confirmButton")
            .disabled = false;


        $("confirmButton")
            .textContent =
            "Onayla";

    }
);
