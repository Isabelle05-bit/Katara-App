import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { OrcamentoCompleto } from '../repositories/orcamentos';
import { gerarHtmlOrcamento, nomeArquivoPdf, type OpcoesPdf } from './html';

/**
 * HTML → PDF (expo-print) → renomeia para um nome previsível → menu de
 * compartilhar do Android (o Anderson escolhe o contato no WhatsApp).
 */
export async function gerarPdf(o: OrcamentoCompleto, opcoes: OpcoesPdf): Promise<File> {
  const html = gerarHtmlOrcamento(o, opcoes);
  const { uri } = await Print.printToFileAsync({ html });

  const destino = new File(Paths.cache, nomeArquivoPdf(o, opcoes.versao, opcoes.emitidoEm));
  if (destino.exists) destino.delete();
  await new File(uri).move(destino);
  return destino;
}

export async function compartilharPdf(arquivo: File) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(arquivo.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Enviar orçamento',
    UTI: 'com.adobe.pdf',
  });
}

export async function gerarECompartilharPdf(o: OrcamentoCompleto, opcoes: OpcoesPdf) {
  const arquivo = await gerarPdf(o, opcoes);
  await compartilharPdf(arquivo);
  return arquivo;
}
