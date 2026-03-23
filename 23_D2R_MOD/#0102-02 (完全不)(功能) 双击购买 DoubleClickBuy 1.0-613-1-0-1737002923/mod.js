if (D2RMM.getVersion == null || D2RMM.getVersion() < 1.6) {
    D2RMM.error('Requires D2RMM version 1.6 or higher.');
    return;
}

const npcdialogpanelhdFilename = 'global\\ui\\layouts\\npcdialogpanelhd.json';

const npcdialogpanelhd = D2RMM.readJson(npcdialogpanelhdFilename);

adjustNpcDialogPanel();

D2RMM.writeJson(npcdialogpanelhdFilename, npcdialogpanelhd);

function adjustNpcDialogPanel()
{
    npcdialogpanelhd.fields.verticalOffset = 40;
}