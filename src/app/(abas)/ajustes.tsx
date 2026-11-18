import { View } from 'react-native';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { escolherBackup, exportarBackup, restaurarBackup } from '../../backup/backup';
import { LATEST_VERSION } from '../../db/migrations';
import { Aviso, Card, Secao } from '../../ui/Blocos';
import { Botao } from '../../ui/Botao';
import { useFeedback } from '../../ui/Feedback';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor } from '../../ui/tema';

export default function Ajustes() {
  const db = useSQLiteContext();
  const { avisar, confirmar } = useFeedback();

  const exportar = async () => {
    try {
      await exportarBackup(db);
      avisar('Backup pronto. Guarde o arquivo em um lugar seguro.');
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const restaurar = async () => {
    const seguir = await confirmar({
      titulo: 'Restaurar backup?',
      texto:
        'Isso troca TODOS os dados atuais (clientes, orçamentos, atendimentos) pelos do arquivo que você escolher. ' +
        'Antes, o app guarda uma cópia de segurança dos dados de agora.',
      botao: 'Escolher arquivo',
    });
    if (!seguir) return;

    try {
      const escolhido = await escolherBackup();
      if (!escolhido.ok) {
        if (!escolhido.cancelado) avisar(escolhido.motivo ?? 'Arquivo inválido.', 'erro');
        return;
      }
      const certeza = await confirmar({
        titulo: 'Substituir todos os dados?',
        texto:
          'Os dados de agora serão trocados pelos do backup. ' +
          (escolhido.precisaMigrar ? 'O backup é de uma versão anterior e será atualizado. ' : '') +
          'Esta ação não pode ser desfeita pelo app.',
        botao: 'Sim, substituir tudo',
        perigo: true,
      });
      if (!certeza) {
        avisar('Restauração cancelada. Nada foi alterado.');
        return;
      }
      await restaurarBackup(db, escolhido.arquivo);
      avisar('Backup restaurado com sucesso.');
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  return (
    <Tela titulo="Ajustes" comAbas>
      <Secao titulo="Backup">
        <Texto variante="apoio">
          Guarde uma cópia de todos os dados e mande para o seu WhatsApp, e-mail ou Google Drive.
        </Texto>
        <Aviso tipo="info" texto="Faça isso toda semana. Se o celular quebrar ou for trocado, é com esse arquivo que você recupera tudo." />
        <Botao titulo="Exportar backup" icone="backup" onPress={exportar} />
        <Botao titulo="Restaurar backup" icone="restaurar" variante="secundario" onPress={restaurar} />
        <Texto variante="legenda" cor={cor.amarelo}>
          Restaurar substitui todos os dados atuais.
        </Texto>
      </Secao>

      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Texto variante="apoio">Versão do app</Texto>
          <Texto variante="corpoForte">{Constants.expoConfig?.version ?? '—'}</Texto>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Texto variante="apoio">Versão do banco</Texto>
          <Texto variante="corpoForte">{LATEST_VERSION}</Texto>
        </View>
      </Card>

      <Texto variante="legenda" cor={cor.texto3} style={{ textAlign: 'center' }}>
        Katara Pinturas & Efeitos · @katara.pinturas · (51) 99338-6333
      </Texto>
    </Tela>
  );
}
