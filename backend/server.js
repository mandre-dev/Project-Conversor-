const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// --- Bibliotecas de Conversão Real ---
const sharp = require('sharp'); // Para imagens
const convert = require('libreoffice-convert'); // Para documentos (requer LibreOffice instalado)
convert.convert = require('util').promisify(convert.convert);

const app = express();
const port = 3000;

// ⚠️ IMPORTANTE: Ajuste o endereço do Live Server aqui!
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

// --- CONFIGURAÇÃO DO MULTER (UPLOAD) ---

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// --- LÓGICA DE CONVERSÃO REAL ---

const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
const documentFormats = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx', 'xml'];

/**
 * Executa a conversão real baseada no formato de destino.
 */
const performRealConversion = async (inputPath, targetFormat, originalExt) => {
    const inputExtension = originalExt.toLowerCase();
    const targetExtension = targetFormat.toLowerCase();
    
    // Define o caminho de saída com a nova extensão
    const outputFileName = `converted_file_temp.${targetExtension}`;
    const outputPath = path.join('uploads', outputFileName);
    
    console.log(`[CONVERSÃO REAL] De .${inputExtension} para .${targetExtension}`);
    
    // 1. Conversão de IMAGEM (Usando Sharp)
    if (imageFormats.includes(targetExtension) && imageFormats.includes(inputExtension)) {
        
        let sharpProcessor = sharp(inputPath);
        
        // Aplica o método de conversão do Sharp baseado no formato de destino
        if (targetExtension === 'png') sharpProcessor = sharpProcessor.png();
        else if (targetExtension === 'jpg' || targetExtension === 'jpeg') sharpProcessor = sharpProcessor.jpeg();
        else if (targetExtension === 'gif') sharpProcessor = sharpProcessor.gif();
        else if (targetExtension === 'svg') sharpProcessor = sharpProcessor.svg();

        await sharpProcessor.toFile(outputPath);
        return outputPath;
    } 
    
    // 2. Conversão de DOCUMENTO (Usando LibreOffice)
    else if (documentFormats.includes(targetExtension)) {
        // LibreOffice Convert exige que o arquivo de entrada tenha a extensão correta
        const tempNameWithExt = `temp_input.${inputExtension}`;
        const tempPathWithExt = path.join('uploads', tempNameWithExt);

        // Renomeia ou copia o arquivo para que tenha a extensão correta para o LibreOffice
        fs.copyFileSync(inputPath, tempPathWithExt);
        
        const file = fs.readFileSync(tempPathWithExt);
        
        // Executa a conversão (função promificada)
        let convertedBuffer = await convert(file, targetExtension, undefined);
        
        fs.writeFileSync(outputPath, convertedBuffer);
        
        // Remove o arquivo temporário com extensão
        fs.unlinkSync(tempPathWithExt); 
        
        return outputPath;
    }
    
    // 3. Formato não suportado ou sem lógica implementada
    else {
        throw new Error(`Conversão de .${inputExtension} para .${targetExtension} não suportada pelo servidor.`);
    }
};


// --- ROTA DE UPLOAD E CONVERSÃO ---

app.post('/convert', upload.single('file'), async (req, res) => {
    
    if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });

    const targetFormat = req.body.targetFormat;
    const originalFileName = req.file.originalname;
    const tempPath = req.file.path; // Caminho temporário criado pelo multer
    const originalExt = originalFileName.split('.').pop();

    if (!targetFormat) {
        fs.unlinkSync(tempPath); 
        return res.status(400).json({ success: false, message: 'Formato de destino não especificado.' });
    }
    
    let convertedFilePath = null;

    try {
        // 1. Executa a conversão real
        convertedFilePath = await performRealConversion(tempPath, targetFormat, originalExt);

        // 2. Define o novo nome do arquivo para download
        const newFileName = originalFileName.split('.').slice(0, -1).join('.') + `.${targetFormat}`;
        
        // 3. Retorna o arquivo convertido
        res.download(convertedFilePath, newFileName, (err) => {
            
            // 4. Cleanup: Remove o arquivo temporário original e o arquivo convertido
            try {
                fs.unlinkSync(tempPath);
                if (convertedFilePath) fs.unlinkSync(convertedFilePath);
            } catch (e) {
                console.error("Erro ao limpar arquivos temporários:", e.message);
            }
            
            if (err) {
                console.error('Erro no download (cliente fechou):', err.message);
            }
        });

    } catch (error) {
        console.error('Erro durante a conversão:', error);
        
        // Cleanup em caso de falha
        fs.unlinkSync(tempPath); 
        if (convertedFilePath && fs.existsSync(convertedFilePath)) fs.unlinkSync(convertedFilePath);
        
        res.status(500).json({ success: false, message: error.message || 'Erro interno durante o processamento da conversão.' });
    }
});


// --- INÍCIO DO SERVIDOR ---
app.listen(port, () => {
    console.log(`\nServidor de conversão rodando em http://localhost:${port}`);
    console.log('----------------------------------------------------');
});