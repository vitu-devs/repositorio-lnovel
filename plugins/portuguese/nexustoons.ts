import { Plugin } from '@/types/plugin';
import { fetchApi } from '@libs/fetch';
import { defaultCover } from '@libs/defaultCover';
import { NovelStatus } from '@libs/novelStatus';
import { load as loadCheerio } from 'cheerio';

type Chapter = {
  id: number;
  number: string;
  title?: string;
  createdAt?: string;
  releaseStatus?: string;
  accessLevel?: string;
  scanGroups?: { name: string }[];
};
type Novel = {
  slug: string;
  title: string;
  type: string;
  coverImage?: string;
  description?: string;
  author?: string;
  status?: string;
  categories?: { name?: string; category?: { name: string } }[];
  chapters?: Chapter[];
};
type Envelope = { d: string; k: number; v: number };

// Public response-codec keys derived by the site's shipped JavaScript client.
// These are not account credentials; authentication/access checks stay server-side.
const codecKeys = [
  'ee47fe201c45929db9c9a9212d9c38571965a43326323d63a48f60ac29afebd6',
  'e68082cdd86e5f59365c31e53259327623c393b752cd79f5ebf4a6c01ce5daa5',
  'e2bc4ff2ef9c3713b124114e7f7f87a2e14657faaccc9edcd077e6f4073c4773',
  '771bd0234efb5cec754b953e3678e0d6b2552dedf387328e9d7600dac151b649',
  'd6cd99f678b363376b4c722cc3b13b102c11959ff1ee8a312cb730f9c9142b1a',
];

function decodeResponse<T>(data: T | Envelope): T {
  if (!data || typeof data !== 'object' || !('d' in data)) return data as T;
  const envelope = data as Envelope;
  const keyHex = codecKeys[envelope.v === 1 ? 0 : envelope.k];
  if (
    ![1, 2].includes(envelope.v) ||
    !keyHex ||
    typeof envelope.d !== 'string'
  ) {
    throw new Error('Nexustoons mudou o formato da API. Atualize o plugin.');
  }
  const key = keyHex.match(/../g)!.map(byte => parseInt(byte, 16));
  const box = Array.from({ length: 256 }, (_, index) => index);
  const inverse: number[] = [];
  let offset = 0;
  for (let index = 0; index < 256; index++) {
    offset = (offset + box[index] + key[index % 32]) % 256;
    [box[index], box[offset]] = [box[offset], box[index]];
  }
  box.forEach((value, index) => (inverse[value] = index));
  // Avoid atob, Buffer and TextDecoder: they are not universal in Hermes.
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const input: number[] = [];
  let bits = 0;
  let accumulator = 0;
  for (const character of envelope.d.replace(/=+$/, '')) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error('Resposta inválida da Nexustoons.');
    accumulator = (accumulator << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      input.push((accumulator >> bits) & 255);
    }
  }
  const output: string[] = [];
  for (let index = 0; index < input.length; index++) {
    const value = inverse[input[index] ^ (index ? input[index - 1] : key[31])];
    const rotation = (((key[(index + 3) % 32] + (index & 255)) & 255) % 7) + 1;
    const byte =
      (((value >>> rotation) | (value << (8 - rotation))) & 255) ^
      key[index % 32];
    output.push('%' + ('0' + byte.toString(16)).slice(-2));
  }
  try {
    return JSON.parse(decodeURIComponent(output.join(''))) as T;
  } catch {
    throw new Error(
      'Não foi possível decodificar a Nexustoons. Atualize o plugin.',
    );
  }
}

class NexustoonsPlugin implements Plugin.PluginBase {
  id = 'nexustoons';
  name = 'Nexustoons (Novels)';
  site = 'https://nexustoons.com';
  version = '1.0.0';
  icon = 'src/pt-br/nexustoons/icon.png';
  imageRequestInit = { headers: { Referer: this.site + '/' } };

  private isNovel(type: string) {
    return ['novel', 'light novel', 'web novel'].includes(type?.toLowerCase());
  }

  private async request<T>(path: string, referer = this.site + '/') {
    const response = await fetchApi(this.site + '/api' + path, {
      headers: {
        Referer: referer,
        Origin: this.site,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(
        `Nexustoons: HTTP ${response.status}. Abra a fonte no navegador para verificar disponibilidade ou acesso.`,
      );
    }
    return decodeResponse<T>(await response.json());
  }

  private item(novel: Novel): Plugin.NovelItem {
    return {
      name: novel.title,
      path: '/novel/' + novel.slug,
      cover: novel.coverImage || defaultCover,
    };
  }

  private async list(pageNo: number, searchTerm = '', latest = false) {
    if (!Number.isInteger(pageNo) || pageNo < 1) return [];
    const response = await this.request<{
      data: Novel[] | null;
      pages: number;
      total: number;
    }>(
      '/mangas?type=novel,light%20novel,web%20novel&limit=30&page=' +
        pageNo +
        '&sortBy=' +
        (latest ? 'updatedAt' : 'views') +
        '&sortOrder=desc' +
        '&search=' +
        encodeURIComponent(searchTerm),
    );
    if (
      response.data === null &&
      (response.total === 0 || pageNo > response.pages)
    )
      return [];
    if (!Array.isArray(response.data))
      throw new Error('Catálogo da Nexustoons inválido.');
    if (pageNo > response.pages) return [];
    return response.data
      .filter(novel => this.isNovel(novel.type))
      .map(novel => this.item(novel));
  }

  popularNovels(pageNo: number, options: Plugin.PopularNovelsOptions) {
    return this.list(pageNo, '', options?.showLatestNovels);
  }

  searchNovels(searchTerm: string, pageNo: number) {
    return this.list(pageNo, searchTerm);
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const match = /^\/novel\/([^/?#]+)$/.exec(novelPath);
    if (!match) throw new Error('Endereço de novel inválido.');
    const novel = await this.request<Novel>('/manga/' + match[1]);
    if (!this.isNovel(novel.type))
      throw new Error('Esta fonte aceita somente novels.');
    if (!Array.isArray(novel.chapters))
      throw new Error('Lista de capítulos indisponível.');
    const statuses: Record<string, string> = {
      ongoing: NovelStatus.Ongoing,
      completed: NovelStatus.Completed,
      hiatus: NovelStatus.OnHiatus,
      cancelled: NovelStatus.Cancelled,
    };
    const seen = new Set<number>();
    const chapters = novel.chapters
      .filter(chapter => {
        if (chapter.releaseStatus && chapter.releaseStatus !== 'published')
          return false;
        if (seen.has(chapter.id)) return false;
        seen.add(chapter.id);
        return true;
      })
      .sort((left, right) => parseFloat(left.number) - parseFloat(right.number))
      .map(chapter => ({
        name: `Capítulo ${chapter.number}${chapter.title ? ' — ' + chapter.title : ''}${chapter.accessLevel && chapter.accessLevel !== 'public' ? ' [Restrito]' : ''}`,
        path: `/ler/${novel.slug}/${chapter.id}`,
        chapterNumber: parseFloat(chapter.number),
        releaseTime: chapter.createdAt,
        scanlator: chapter.scanGroups?.map(group => group.name),
      }));
    return {
      ...this.item(novel),
      path: novelPath,
      summary: novel.description,
      author: novel.author,
      genres: novel.categories
        ?.map(category => category.category?.name || category.name)
        .filter(Boolean)
        .join(', '),
      status: statuses[novel.status || ''] || NovelStatus.Unknown,
      chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const match = /^\/ler\/([^/?#]+)\/(\d+)$/.exec(chapterPath);
    if (!match) throw new Error('Endereço de capítulo inválido.');
    const chapter = await this.request<{
      contentType?: string;
      textContent?: string;
      requiresSession?: boolean;
      accessLevel?: string;
      manga?: { type?: string };
    }>('/chapter/' + match[2], this.resolveUrl(chapterPath));
    if (
      chapter.requiresSession ||
      (chapter.accessLevel && chapter.accessLevel !== 'public')
    ) {
      throw new Error(
        'Este capítulo exige acesso ou verificação no site da Nexustoons. Leia-o pelo navegador da fonte.',
      );
    }
    if (chapter.contentType !== 'text' || !chapter.textContent?.trim()) {
      throw new Error('O site não disponibilizou texto para este capítulo.');
    }
    const $ = loadCheerio(chapter.textContent);
    $(
      'script, style, iframe, object, embed, form, input, button, link, meta',
    ).remove();
    $('*').each((_, element) => {
      if (!('attribs' in element)) return;
      for (const attribute of Object.keys(element.attribs || {})) {
        if (
          /^on/i.test(attribute) ||
          ['style', 'srcdoc'].includes(attribute) ||
          (['href', 'src'].includes(attribute) &&
            /^\s*(javascript|data|vbscript):/i.test(element.attribs[attribute]))
        ) {
          $(element).removeAttr(attribute);
        }
      }
    });
    if (!$('body').text().trim())
      throw new Error('O capítulo recebido está vazio.');
    return $('body').html() || '';
  }

  resolveUrl(path: string) {
    return this.site + path;
  }
}

export default new NexustoonsPlugin();
