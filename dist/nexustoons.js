"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fetch_1 = require("@libs/fetch");
var defaultCover_1 = require("@libs/defaultCover");
var novelStatus_1 = require("@libs/novelStatus");
var cheerio_1 = require("cheerio");
// Public response-codec keys derived by the site's shipped JavaScript client.
// These are not account credentials; authentication/access checks stay server-side.
var codecKeys = [
    'ee47fe201c45929db9c9a9212d9c38571965a43326323d63a48f60ac29afebd6',
    'e68082cdd86e5f59365c31e53259327623c393b752cd79f5ebf4a6c01ce5daa5',
    'e2bc4ff2ef9c3713b124114e7f7f87a2e14657faaccc9edcd077e6f4073c4773',
    '771bd0234efb5cec754b953e3678e0d6b2552dedf387328e9d7600dac151b649',
    'd6cd99f678b363376b4c722cc3b13b102c11959ff1ee8a312cb730f9c9142b1a',
];
function decodeResponse(data) {
    var _a;
    if (!data || typeof data !== 'object' || !('d' in data))
        return data;
    var envelope = data;
    var keyHex = codecKeys[envelope.v === 1 ? 0 : envelope.k];
    if (![1, 2].includes(envelope.v) ||
        !keyHex ||
        typeof envelope.d !== 'string') {
        throw new Error('Nexustoons mudou o formato da API. Atualize o plugin.');
    }
    var key = keyHex.match(/../g).map(function (byte) { return parseInt(byte, 16); });
    var box = Array.from({ length: 256 }, function (_, index) { return index; });
    var inverse = [];
    var offset = 0;
    for (var index = 0; index < 256; index++) {
        offset = (offset + box[index] + key[index % 32]) % 256;
        _a = [box[offset], box[index]], box[index] = _a[0], box[offset] = _a[1];
    }
    box.forEach(function (value, index) { return (inverse[value] = index); });
    // Avoid atob, Buffer and TextDecoder: they are not universal in Hermes.
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var input = [];
    var bits = 0;
    var accumulator = 0;
    for (var _i = 0, _b = envelope.d.replace(/=+$/, ''); _i < _b.length; _i++) {
        var character = _b[_i];
        var value = alphabet.indexOf(character);
        if (value < 0)
            throw new Error('Resposta inválida da Nexustoons.');
        accumulator = (accumulator << 6) | value;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            input.push((accumulator >> bits) & 255);
        }
    }
    var output = [];
    for (var index = 0; index < input.length; index++) {
        var value = inverse[input[index] ^ (index ? input[index - 1] : key[31])];
        var rotation = (((key[(index + 3) % 32] + (index & 255)) & 255) % 7) + 1;
        var byte = (((value >>> rotation) | (value << (8 - rotation))) & 255) ^
            key[index % 32];
        output.push('%' + ('0' + byte.toString(16)).slice(-2));
    }
    try {
        return JSON.parse(decodeURIComponent(output.join('')));
    }
    catch (_c) {
        throw new Error('Não foi possível decodificar a Nexustoons. Atualize o plugin.');
    }
}
var NexustoonsPlugin = /** @class */ (function () {
    function NexustoonsPlugin() {
        this.id = 'nexustoons';
        this.name = 'Nexustoons (Novels)';
        this.site = 'https://nexustoons.com';
        this.version = '1.0.1';
        this.icon = 'src/pt-br/nexustoons/icon.png';
        this.imageRequestInit = { headers: { Referer: this.site + '/' } };
    }
    NexustoonsPlugin.prototype.isNovel = function (type) {
        return ['novel', 'light novel', 'web novel'].includes(type === null || type === void 0 ? void 0 : type.toLowerCase());
    };
    NexustoonsPlugin.prototype.request = function (path_1) {
        return __awaiter(this, arguments, void 0, function (path, referer) {
            var response, _a;
            if (referer === void 0) { referer = this.site + '/'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, fetch_1.fetchApi)(this.site + '/api' + path, {
                            headers: {
                                Referer: referer,
                                Origin: this.site,
                                Accept: 'application/json',
                            },
                        })];
                    case 1:
                        response = _b.sent();
                        if (!response.ok) {
                            throw new Error("Nexustoons: HTTP ".concat(response.status, ". Abra a fonte no navegador para verificar disponibilidade ou acesso."));
                        }
                        _a = decodeResponse;
                        return [4 /*yield*/, response.json()];
                    case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                }
            });
        });
    };
    NexustoonsPlugin.prototype.item = function (novel) {
        return {
            name: novel.title,
            path: '/novel/' + novel.slug,
            cover: novel.coverImage || defaultCover_1.defaultCover,
        };
    };
    NexustoonsPlugin.prototype.list = function (pageNo_1) {
        return __awaiter(this, arguments, void 0, function (pageNo, searchTerm, latest) {
            var response;
            var _this = this;
            if (searchTerm === void 0) { searchTerm = ''; }
            if (latest === void 0) { latest = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!Number.isInteger(pageNo) || pageNo < 1)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, this.request('/mangas?type=novel,light%20novel,web%20novel&limit=30&page=' +
                                pageNo +
                                '&sortBy=' +
                                (latest ? 'updatedAt' : 'views') +
                                '&sortOrder=desc' +
                                '&search=' +
                                encodeURIComponent(searchTerm))];
                    case 1:
                        response = _a.sent();
                        if (response.data === null &&
                            (response.total === 0 || pageNo > response.pages))
                            return [2 /*return*/, []];
                        if (!Array.isArray(response.data))
                            throw new Error('Catálogo da Nexustoons inválido.');
                        if (pageNo > response.pages)
                            return [2 /*return*/, []];
                        return [2 /*return*/, response.data
                                .filter(function (novel) { return _this.isNovel(novel.type); })
                                .map(function (novel) { return _this.item(novel); })];
                }
            });
        });
    };
    NexustoonsPlugin.prototype.popularNovels = function (pageNo, options) {
        return this.list(pageNo, '', options === null || options === void 0 ? void 0 : options.showLatestNovels);
    };
    NexustoonsPlugin.prototype.searchNovels = function (searchTerm, pageNo) {
        return this.list(pageNo, searchTerm);
    };
    NexustoonsPlugin.prototype.parseNovel = function (novelPath) {
        return __awaiter(this, void 0, Promise, function () {
            var match, novel, statuses, seen, chapters;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        match = /^\/novel\/([^/?#]+)$/.exec(novelPath);
                        if (!match)
                            throw new Error('Endereço de novel inválido.');
                        return [4 /*yield*/, this.request('/manga/' + match[1])];
                    case 1:
                        novel = _b.sent();
                        if (!this.isNovel(novel.type))
                            throw new Error('Esta fonte aceita somente novels.');
                        if (!Array.isArray(novel.chapters))
                            throw new Error('Lista de capítulos indisponível.');
                        statuses = {
                            ongoing: novelStatus_1.NovelStatus.Ongoing,
                            completed: novelStatus_1.NovelStatus.Completed,
                            hiatus: novelStatus_1.NovelStatus.OnHiatus,
                            cancelled: novelStatus_1.NovelStatus.Cancelled,
                        };
                        seen = new Set();
                        chapters = novel.chapters
                            .filter(function (chapter) {
                            if (chapter.releaseStatus && chapter.releaseStatus !== 'published')
                                return false;
                            if (seen.has(chapter.id))
                                return false;
                            seen.add(chapter.id);
                            return true;
                        })
                            .sort(function (left, right) { return parseFloat(left.number) - parseFloat(right.number); })
                            .map(function (chapter) {
                            var _a;
                            return ({
                                name: "Cap\u00EDtulo ".concat(chapter.number).concat(chapter.title ? ' — ' + chapter.title : '').concat(chapter.accessLevel && chapter.accessLevel !== 'public' ? ' [Restrito]' : ''),
                                path: "/ler/".concat(novel.slug, "/").concat(chapter.id),
                                chapterNumber: parseFloat(chapter.number),
                                releaseTime: chapter.createdAt,
                                scanlator: (_a = chapter.scanGroups) === null || _a === void 0 ? void 0 : _a.map(function (group) { return group.name; }),
                            });
                        });
                        return [2 /*return*/, __assign(__assign({}, this.item(novel)), { path: novelPath, summary: novel.description, author: novel.author, genres: (_a = novel.categories) === null || _a === void 0 ? void 0 : _a.map(function (category) { var _a; return ((_a = category.category) === null || _a === void 0 ? void 0 : _a.name) || category.name; }).filter(Boolean).join(', '), status: statuses[novel.status || ''] || novelStatus_1.NovelStatus.Unknown, chapters: chapters })];
                }
            });
        });
    };
    NexustoonsPlugin.prototype.parseChapter = function (chapterPath) {
        return __awaiter(this, void 0, Promise, function () {
            var match, chapter, $, inlineTags;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        match = /^\/ler\/([^/?#]+)\/(\d+)$/.exec(chapterPath);
                        if (!match)
                            throw new Error('Endereço de capítulo inválido.');
                        return [4 /*yield*/, this.request('/chapter/' + match[2], this.resolveUrl(chapterPath))];
                    case 1:
                        chapter = _b.sent();
                        if (chapter.requiresSession ||
                            (chapter.accessLevel && chapter.accessLevel !== 'public')) {
                            throw new Error('Este capítulo exige acesso ou verificação no site da Nexustoons. Leia-o pelo navegador da fonte.');
                        }
                        if (chapter.contentType !== 'text' || !((_a = chapter.textContent) === null || _a === void 0 ? void 0 : _a.trim())) {
                            throw new Error('O site não disponibilizou texto para este capítulo.');
                        }
                        $ = (0, cheerio_1.load)(chapter.textContent);
                        $('script, style, iframe, object, embed, form, input, button, link, meta').remove();
                        $('*').each(function (_, element) {
                            if (!('attribs' in element))
                                return;
                            for (var _i = 0, _a = Object.keys(element.attribs || {}); _i < _a.length; _i++) {
                                var attribute = _a[_i];
                                if (/^on/i.test(attribute) ||
                                    ['style', 'srcdoc'].includes(attribute) ||
                                    (['href', 'src'].includes(attribute) &&
                                        /^\s*(javascript|data|vbscript):/i.test(element.attribs[attribute]))) {
                                    $(element).removeAttr(attribute);
                                }
                            }
                        });
                        inlineTags = [
                            'b',
                            'i',
                            'span',
                            'em',
                            'br',
                            'strong',
                            'a',
                            'mark',
                            'small',
                            'u',
                            's',
                            'sub',
                            'sup',
                        ];
                        $('body, div, section, article, blockquote, li')
                            .toArray()
                            .reverse()
                            .forEach(function (container) {
                            var parts = [];
                            var paragraph = '';
                            var flush = function () {
                                if ((0, cheerio_1.load)(paragraph).text().trim())
                                    parts.push('<p>' + paragraph + '</p>');
                                else if (paragraph.trim())
                                    parts.push(paragraph);
                                paragraph = '';
                            };
                            $(container)
                                .contents()
                                .each(function (_, node) {
                                if (node.type === 'text') {
                                    var pieces = $.html(node).split(/\r?\n\s*\r?\n/);
                                    pieces.forEach(function (piece, index) {
                                        if (index)
                                            flush();
                                        paragraph += piece;
                                    });
                                }
                                else if ('tagName' in node && inlineTags.includes(node.tagName)) {
                                    paragraph += $.html(node);
                                }
                                else {
                                    flush();
                                    parts.push($.html(node));
                                }
                            });
                            flush();
                            $(container).html(parts.join('\n'));
                        });
                        if (!$('body').text().trim())
                            throw new Error('O capítulo recebido está vazio.');
                        return [2 /*return*/, $('body').html() || ''];
                }
            });
        });
    };
    NexustoonsPlugin.prototype.resolveUrl = function (path) {
        return this.site + path;
    };
    return NexustoonsPlugin;
}());
exports.default = new NexustoonsPlugin();
