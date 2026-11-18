import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

/**
 * Logo da Katara como data URI para embutir no HTML do PDF (o expo-print não
 * acessa arquivos do app por caminho). A logo tem fundo preto e entra no PDF
 * como um "selo" quadrado, como no protótipo. Carregada uma vez e guardada.
 */
let cache: Promise<string | undefined> | null = null;

export function carregarLogoDataUri(): Promise<string | undefined> {
  if (!cache) {
    cache = (async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/images/logo.png'));
        await asset.downloadAsync();
        if (!asset.localUri) return undefined;
        const base64 = await new File(asset.localUri).base64();
        return `data:image/png;base64,${base64}`;
      } catch {
        cache = null; // tenta de novo na próxima; o PDF sai com o nome da empresa
        return undefined;
      }
    })();
  }
  return cache;
}
