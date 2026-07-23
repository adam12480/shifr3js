const fileInput = document.getElementById("file");
const passwordInput = document.getElementById("password");

const encryptBtn = document.getElementById("encryptBtn");
const decryptBtn = document.getElementById("decryptBtn");


// Faylni ArrayBuffer ko'rinishida o'qish
async function readFile(file) {
    return await file.arrayBuffer();
}


// Faylni yuklab berish
function downloadFile(data, filename) {

    const blob = new Blob([data], {
        type: "application/octet-stream"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Paroldan AES kalit hosil qilish
async function deriveKey(password, salt) {

    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );

}


encryptBtn.addEventListener("click", async () => {

    const file = fileInput.files[0];
    const password = passwordInput.value;

    if (!file || !password) {
        alert("Fayl va parolni kiriting!");
        return;
    }

    // Faylni o'qish
    const data = await readFile(file);

    // Tasodifiy salt va iv yaratish
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Paroldan kalit hosil qilish
    const key = await deriveKey(password, salt);

    // Shifrlash
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    // Salt + IV + Shifrlangan ma'lumotni bitta faylga birlashtirish
    const result = new Uint8Array(
        salt.length +
        iv.length +
        encrypted.byteLength
    );

    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(
        new Uint8Array(encrypted),
        salt.length + iv.length
    );

    // Yuklab olish
    downloadFile(
        result,
        "encrypted.enc"
    );

}); 


decryptBtn.addEventListener("click", async () => {

    const file = fileInput.files[0];
    const password = passwordInput.value;

    if (!file || !password) {
        alert("Fayl va parolni kiriting!");
        return;
    }

    try {

        // Faylni o'qish
        const buffer = await readFile(file);
        const bytes = new Uint8Array(buffer);

        // Salt va IV ni ajratib olish
        const salt = bytes.slice(0, 16);
        const iv = bytes.slice(16, 28);
        const encrypted = bytes.slice(28);

        // Kalit hosil qilish
        const key = await deriveKey(password, salt);

        // Rasshifrovka
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encrypted
        );

        // Asl fayl nomi
        let filename = file.name;

        if (filename.endsWith(".enc")) {
            filename = filename.slice(0, -4);
        }

        // Yuklab olish
        downloadFile(decrypted,  "decrypted.txt");

    } catch (err) {

        alert("❌ Parol noto'g'ri yoki fayl buzilgan!");

    }

});