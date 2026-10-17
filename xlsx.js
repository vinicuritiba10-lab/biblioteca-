//planilha
(function (raiz, criar) {
    const modulo = criar();
    if (typeof module === "object" && module.exports) module.exports = modulo;
    else Object.assign(raiz, modulo);
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    const COR = {
        laranja: "FFEC380B",
        roxo: "FF764BA2",
        branco: "FFFFFFFF",
        cinza: "FF6B7280",
        texto: "FF2D3436",
        borda: "FFE4E7EB",
        zebra: "FFF7F3FB",
        bom: "FF1E7A47",
        alerta: "FFB86E00",
        ruim: "FFC0392B"
    };

    // ---------------- zip (sem compressão) ----------------

    const TABELA_CRC = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();

    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function gerarZip(arquivos) {
        const codificar = s => new TextEncoder().encode(s);
        const partes = [];
        const central = [];
        let deslocamento = 0;

        for (const { nome, dados } of arquivos) {
            const bytesNome = codificar(nome);
            const conteudo = typeof dados === "string" ? codificar(dados) : dados;
            const crc = crc32(conteudo);

            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);
            local.setUint16(4, 20, true);
            local.setUint16(6, 0x0800, true);      // nomes em UTF-8
            local.setUint16(8, 0, true);           // sem compressão
            local.setUint16(10, 0, true);
            local.setUint16(12, 0x21, true);       // data fixa: 01/01/1980
            local.setUint32(14, crc, true);
            local.setUint32(18, conteudo.length, true);
            local.setUint32(22, conteudo.length, true);
            local.setUint16(26, bytesNome.length, true);
            local.setUint16(28, 0, true);
            partes.push(new Uint8Array(local.buffer), bytesNome, conteudo);

            const dir = new DataView(new ArrayBuffer(46));
            dir.setUint32(0, 0x02014b50, true);
            dir.setUint16(4, 20, true);
            dir.setUint16(6, 20, true);
            dir.setUint16(8, 0x0800, true);
            dir.setUint16(10, 0, true);
            dir.setUint16(12, 0, true);
            dir.setUint16(14, 0x21, true);
            dir.setUint32(16, crc, true);
            dir.setUint32(20, conteudo.length, true);
            dir.setUint32(24, conteudo.length, true);
            dir.setUint16(28, bytesNome.length, true);
            dir.setUint32(42, deslocamento, true);
            central.push(new Uint8Array(dir.buffer), bytesNome);

            deslocamento += 30 + bytesNome.length + conteudo.length;
        }

        const tamanhoCentral = central.reduce((t, p) => t + p.length, 0);
        const fim = new DataView(new ArrayBuffer(22));
        fim.setUint32(0, 0x06054b50, true);
        fim.setUint16(8, arquivos.length, true);
        fim.setUint16(10, arquivos.length, true);
        fim.setUint32(12, tamanhoCentral, true);
        fim.setUint32(16, deslocamento, true);

        const todas = [...partes, ...central, new Uint8Array(fim.buffer)];
        const saida = new Uint8Array(todas.reduce((t, p) => t + p.length, 0));
        let pos = 0;
        for (const p of todas) { saida.set(p, pos); pos += p.length; }
        return saida;
    }

    // ---------------- estilos ----------------

    function criarEstilos() {
        const fontes = ['<font><sz val="11"/><color rgb="' + COR.texto + '"/><name val="Calibri"/><family val="2"/></font>'];
        const preenchimentos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
        const bordas = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
        const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
        const indice = new Map();

        const pegar = (lista, xml) => {
            const i = lista.indexOf(xml);
            if (i >= 0) return i;
            lista.push(xml);
            return lista.length - 1;
        };

        // { tamanho, negrito, italico, cor, fundo, borda, data, alinhar }
        function estilo(o) {
            const chave = JSON.stringify(o);
            if (indice.has(chave)) return indice.get(chave);

            const fonte = pegar(fontes, '<font>' + (o.negrito ? '<b/>' : '') + (o.italico ? '<i/>' : '') +
                '<sz val="' + (o.tamanho || 11) + '"/><color rgb="' + (o.cor || COR.texto) + '"/><name val="Calibri"/><family val="2"/></font>');
            const fundo = o.fundo
                ? pegar(preenchimentos, '<fill><patternFill patternType="solid"><fgColor rgb="' + o.fundo + '"/><bgColor indexed="64"/></patternFill></fill>')
                : 0;
            const borda = o.borda
                ? pegar(bordas, '<border>' + ['left', 'right', 'top', 'bottom'].map(l => '<' + l + ' style="thin"><color rgb="' + COR.borda + '"/></' + l + '>').join('') + '<diagonal/></border>')
                : 0;
            const formato = o.data ? 164 : 0;
            // texto com um pequeno recuo para não colar na borda da célula
            const alinhamento = '<alignment vertical="center"' +
                (o.alinhar ? ' horizontal="' + o.alinhar + '"' : (o.borda ? ' horizontal="left" indent="1"' : '')) + '/>';

            xfs.push('<xf numFmtId="' + formato + '" fontId="' + fonte + '" fillId="' + fundo + '" borderId="' + borda + '" xfId="0"' +
                ' applyFont="1"' + (fundo ? ' applyFill="1"' : '') + (borda ? ' applyBorder="1"' : '') + (formato ? ' applyNumberFormat="1"' : '') +
                ' applyAlignment="1">' + alinhamento + '</xf>');
            const i = xfs.length - 1;
            indice.set(chave, i);
            return i;
        }

        function xml() {
            return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>' +
                '<fonts count="' + fontes.length + '">' + fontes.join('') + '</fonts>' +
                '<fills count="' + preenchimentos.length + '">' + preenchimentos.join('') + '</fills>' +
                '<borders count="' + bordas.length + '">' + bordas.join('') + '</borders>' +
                '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
                '<cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs>' +
                '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
                '</styleSheet>';
        }

        return { estilo, xml };
    }

    // ---------------- células ----------------

    function escaparXML(texto) {
        return String(texto)
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function letraColuna(n) {
        let s = "";
        for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
        return s;
    }

    // Data do Excel = dias desde 30/12/1899 (usa o dia do calendário local)
    function dataExcel(valor) {
        const d = new Date(valor);
        if (isNaN(d)) return null;
        return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
    }

    function celula(ref, valor, tipo, estiloId) {
        if (valor === null || valor === undefined || valor === "") return '<c r="' + ref + '" s="' + estiloId + '"/>';
        if (tipo === "data") {
            const serial = dataExcel(valor);
            return serial === null ? '<c r="' + ref + '" s="' + estiloId + '"/>' : '<c r="' + ref + '" s="' + estiloId + '"><v>' + serial + '</v></c>';
        }
        if (tipo === "numero" && isFinite(Number(valor))) {
            return '<c r="' + ref + '" s="' + estiloId + '"><v>' + Number(valor) + '</v></c>';
        }
        return '<c r="' + ref + '" s="' + estiloId + '" t="inlineStr"><is><t xml:space="preserve">' + escaparXML(valor) + '</t></is></c>';
    }

    // ---------------- planilha ----------------

    // colunas: [{ titulo, valor: linha => ..., tipo: "texto"|"numero"|"data", destaque?: valor => "bom"|"alerta"|"ruim"|null }]
    // logo: bytes de um PNG (opcional), com largura e altura em pixels
    function gerarPlanilhaLibro({ titulo, subtitulo, aba, colunas, linhas, logo }) {
        const estilos = criarEstilos();
        const n = colunas.length;
        const ultima = letraColuna(n - 1);
        const linhaCabecalho = 4;
        const linhaFinal = linhaCabecalho + linhas.length;
        const nomeAba = String(aba || "Planilha").replace(/[\\/?*\[\]:]/g, " ").slice(0, 31);

        const sTitulo = estilos.estilo({ tamanho: 18, negrito: true, cor: COR.laranja });
        const sSub = estilos.estilo({ tamanho: 11, cor: COR.cinza });
        const sCabecalho = estilos.estilo({ negrito: true, cor: COR.branco, fundo: COR.roxo, borda: true });
        const sCorpo = (zebra, tipo, destaque) => estilos.estilo({
            borda: true,
            fundo: zebra ? COR.zebra : undefined,
            data: tipo === "data",
            alinhar: tipo === "numero" || tipo === "data" ? "center" : undefined,
            negrito: !!destaque,
            cor: destaque ? COR[destaque] : undefined
        });

        // larguras pelo maior texto da coluna
        const larguras = colunas.map(c => {
            let maior = String(c.titulo).length;
            for (const l of linhas) {
                const v = c.valor(l);
                const tam = c.tipo === "data" ? 10 : String(v ?? "").length;
                if (tam > maior) maior = tam;
            }
            return Math.min(Math.max(maior + 3, 8), 50);
        });
        if (logo) larguras[0] = Math.max(larguras[0], 8);

        const linhasXml = [];
        linhasXml.push('<row r="1" ht="42" customHeight="1">' + '<c r="A1" s="' + sTitulo + '"/>' +
            celula("B1", titulo, "texto", sTitulo) + '</row>');
        linhasXml.push('<row r="2" ht="18" customHeight="1">' + celula("B2", subtitulo || "", "texto", sSub) + '</row>');
        linhasXml.push('<row r="3" ht="8" customHeight="1"/>');
        linhasXml.push('<row r="4" ht="24" customHeight="1">' +
            colunas.map((c, i) => celula(letraColuna(i) + "4", c.titulo, "texto", sCabecalho)).join("") + '</row>');

        linhas.forEach((linha, li) => {
            const r = linhaCabecalho + 1 + li;
            const zebra = li % 2 === 1;
            linhasXml.push('<row r="' + r + '" ht="20" customHeight="1">' + colunas.map((c, i) => {
                const valor = c.valor(linha);
                const destaque = c.destaque ? c.destaque(valor, linha) : null;
                return celula(letraColuna(i) + r, valor, c.tipo || "texto", sCorpo(zebra, c.tipo, destaque));
            }).join("") + '</row>');
        });

        const filtro = "A" + linhaCabecalho + ":" + ultima + Math.max(linhaFinal, linhaCabecalho + 1);
        const folha = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<sheetPr><tabColor rgb="' + COR.laranja + '"/><pageSetUpPr fitToPage="1"/></sheetPr>' +
            '<dimension ref="A1:' + ultima + Math.max(linhaFinal, 4) + '"/>' +
            '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
            '<sheetFormatPr defaultRowHeight="18"/>' +
            '<cols>' + larguras.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' +
            '<sheetData>' + linhasXml.join('') + '</sheetData>' +
            '<autoFilter ref="' + filtro + '"/>' +
            (n > 1 ? '<mergeCells count="2"><mergeCell ref="B1:' + ultima + '1"/><mergeCell ref="B2:' + ultima + '2"/></mergeCells>' : '') +
            '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
            '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
            (logo ? '<drawing r:id="rId1"/>' : '') +
            '</worksheet>';

        const arquivos = [
            {
                nome: "[Content_Types].xml",
                dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                    '<Default Extension="xml" ContentType="application/xml"/>' +
                    '<Default Extension="png" ContentType="image/png"/>' +
                    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
                    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
                    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
                    (logo ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '') +
                    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
                    '</Types>'
            },
            {
                nome: "_rels/.rels",
                dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
                    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
                    '</Relationships>'
            },
            {
                nome: "docProps/core.xml",
                dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                    '<dc:title>' + escaparXML(titulo) + '</dc:title><dc:creator>Libro</dc:creator>' +
                    '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().slice(0, 19) + 'Z</dcterms:created>' +
                    '</cp:coreProperties>'
            },
            {
                nome: "xl/workbook.xml",
                dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
                    '<sheets><sheet name="' + escaparXML(nomeAba) + '" sheetId="1" r:id="rId1"/></sheets>' +
                    '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'' +
                    escaparXML(nomeAba.replace(/'/g, "''")) + '\'!$A$' + linhaCabecalho + ':$' + ultima + '$' + Math.max(linhaFinal, linhaCabecalho + 1) +
                    '</definedName></definedNames>' +
                    '</workbook>'
            },
            {
                nome: "xl/_rels/workbook.xml.rels",
                dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
                    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
                    '</Relationships>'
            },
            { nome: "xl/styles.xml", dados: estilos.xml() },
            { nome: "xl/worksheets/sheet1.xml", dados: folha }
        ];

        if (logo) {
            const emu = px => Math.round(px * 9525);
            arquivos.push(
                {
                    nome: "xl/worksheets/_rels/sheet1.xml.rels",
                    dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>' +
                        '</Relationships>'
                },
                {
                    nome: "xl/drawings/drawing1.xml",
                    dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                        '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
                        '<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>' + emu(10) + '</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>' + emu(6) + '</xdr:rowOff></xdr:from>' +
                        '<xdr:ext cx="' + emu(logo.largura) + '" cy="' + emu(logo.altura) + '"/>' +
                        '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo do Libro"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
                        '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
                        '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + emu(logo.largura) + '" cy="' + emu(logo.altura) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>' +
                        '<xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>'
                },
                {
                    nome: "xl/drawings/_rels/drawing1.xml.rels",
                    dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>' +
                        '</Relationships>'
                },
                { nome: "xl/media/image1.png", dados: logo.bytes }
            );
        }

        return gerarZip(arquivos);
    }

    return { gerarPlanilhaLibro, letraColuna, dataExcel, crc32 };
});
