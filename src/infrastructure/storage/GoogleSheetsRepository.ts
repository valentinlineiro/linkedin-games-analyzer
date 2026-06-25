import { RunRepository } from '../../core/ports/RunRepository';
import { RawRun, GameType, SpreadsheetInfo } from '../../domain/types';

export class GoogleSheetsRepository implements RunRepository {
  private SHEET_NAME = 'Respuestas de formulario 1';
  private HEADERS = ['Marca temporal', 'Juego', 'Tu Tiempo (Yo)', 'Media de la Comunidad', 'Notas / Comentarios'];

  constructor(
    private spreadsheetId: string | null,
    private tokenProvider: () => string | null
  ) {}

  /**
   * Helper to set active spreadsheet ID dynamically if needed.
   */
  setSpreadsheetId(id: string) {
    this.spreadsheetId = id;
  }

  private getToken(): string {
    const token = this.tokenProvider();
    if (!token) {
      throw new Error('No autenticado con Google.');
    }
    return token;
  }

  // Fetch spreadsheet details (and verify access)
  async fetchSpreadsheetDetails(spreadsheetId: string): Promise<SpreadsheetInfo> {
    const token = this.getToken();
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        throw new Error('No tienes acceso a esta hoja de cálculo. Por favor verifica los permisos.');
      }
      throw new Error('No se pudo cargar la hoja de cálculo. Verifica el ID o URL.');
    }

    const data = await res.json();
    return {
      id: data.spreadsheetId,
      title: data.properties.title,
      url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`
    };
  }

  // Create a new spreadsheet with the default structure
  async createNewSpreadsheet(title: string): Promise<SpreadsheetInfo> {
    const token = this.getToken();
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          {
            properties: { title: this.SHEET_NAME }
          }
        ]
      })
    });

    if (!res.ok) {
      throw new Error('Error al crear una nueva hoja de cálculo.');
    }

    const data = await res.json();
    const newId = data.spreadsheetId;

    // Write headers to the new sheet
    await this.updateSheetValues(newId, `${this.SHEET_NAME}!A1:E1`, [this.HEADERS]);

    return {
      id: newId,
      title,
      url: `https://docs.google.com/spreadsheets/d/${newId}`
    };
  }

  // Update cell values in a range
  private async updateSheetValues(
    spreadsheetId: string, 
    range: string, 
    values: any[][]
  ): Promise<void> {
    const token = this.getToken();
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Error al escribir en el rango ${range}.`);
    }
  }

  // Initialize sheet structure in an existing spreadsheet if "Respuestas de formulario 1" is missing
  private async initializeSheetStructureIfMissing(spreadsheetId: string): Promise<void> {
    const token = this.getToken();

    // Fetch spreadsheet metadata to check if the sheet exists
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) throw new Error('No se pudo verificar la estructura de pestañas.');

    const metaData = await metaRes.json();
    const hasSheet = metaData.sheets?.some((s: any) => s.properties.title === this.SHEET_NAME);

    if (!hasSheet) {
      // Add the sheet
      const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: this.SHEET_NAME }
              }
            }
          ]
        })
      });

      if (!addRes.ok) throw new Error('No se pudo crear la pestaña de respuestas.');

      // Write headers
      await this.updateSheetValues(spreadsheetId, `${this.SHEET_NAME}!A1:E1`, [this.HEADERS]);
    }
  }

  // Load runs from spreadsheet
  async loadRuns(): Promise<RawRun[]> {
    if (!this.spreadsheetId) throw new Error('ID de hoja de cálculo no configurado.');
    const token = this.getToken();

    await this.initializeSheetStructureIfMissing(this.spreadsheetId);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(this.SHEET_NAME + '!A2:E')}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      throw new Error('Error al leer los datos de la hoja de cálculo.');
    }

    const data = await res.json();
    const rows: any[][] = data.values || [];
    const parsedRuns: RawRun[] = [];

    rows.forEach((row, index) => {
      if (!row || row.length < 4) return;

      const timestampRaw = row[0];
      const juegoRaw = row[1];
      const yoRaw = parseFloat(row[2]);
      const mediaRaw = parseFloat(row[3]);
      const nota = row[4] || '';

      if (!juegoRaw || isNaN(yoRaw) || isNaN(mediaRaw)) return;

      const juego = juegoRaw.toString().trim();
      if (!['Patches', 'Zip', 'Sudoku', 'Queens'].includes(juego)) return;

      const timestamp = new Date(timestampRaw).toISOString();
      const ahorro = parseFloat((mediaRaw - yoRaw).toFixed(2));

      parsedRuns.push({
        id: `sheet-row-${index + 2}`, // index + 2 is the 1-indexed row number
        timestamp,
        juego: juego as GameType,
        yo: yoRaw,
        media: mediaRaw,
        ahorro,
        contexto: 'Exploración', // Will be recalculated by domain
        nota
      });
    });

    return parsedRuns;
  }

  // Save run to spreadsheet
  async saveRun(run: Omit<RawRun, 'id'>): Promise<RawRun> {
    if (!this.spreadsheetId) throw new Error('ID de hoja de cálculo no configurado.');
    const token = this.getToken();

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(this.SHEET_NAME + '!A1')}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          range: `${this.SHEET_NAME}!A1`,
          majorDimension: 'ROWS',
          values: [
            [
              run.timestamp,
              run.juego,
              run.yo,
              run.media,
              run.nota || ''
            ]
          ]
        })
      }
    );

    if (!res.ok) {
      throw new Error('No se pudo añadir la partida a la hoja de cálculo.');
    }

    return {
      ...run,
      id: `sheet-row-temp-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  // Delete run from spreadsheet (hides coordinate details internally)
  async deleteRun(id: string): Promise<void> {
    if (!this.spreadsheetId) throw new Error('ID de hoja de cálculo no configurado.');
    const token = this.getToken();

    const rowNumber = parseInt(id.replace('sheet-row-', ''));
    if (isNaN(rowNumber)) {
      throw new Error('ID de fila de hoja de cálculo no válido.');
    }

    // Get exact sheetId of SHEET_NAME
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) throw new Error('Error al obtener metadatos de la hoja.');

    const metaData = await metaRes.json();
    const sheet = metaData.sheets?.find((s: any) => s.properties.title === this.SHEET_NAME);
    if (!sheet) throw new Error(`No se encontró la pestaña "${this.SHEET_NAME}".`);

    const sheetId = sheet.properties.sheetId;

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // 0-indexed start
                endIndex: rowNumber // 0-indexed end (exclusive)
              }
            }
          }
        ]
      })
    });

    if (!res.ok) {
      throw new Error('No se pudo eliminar la fila de la hoja de cálculo.');
    }
  }

  // Seed sheets with a complete batch
  async seedRuns(runs: RawRun[]): Promise<void> {
    if (!this.spreadsheetId) throw new Error('ID de hoja de cálculo no configurado.');
    await this.initializeSheetStructureIfMissing(this.spreadsheetId);

    // Read to check if empty
    const token = this.getToken();
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(this.SHEET_NAME + '!A2:A')}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0) {
        throw new Error('La hoja de cálculo ya contiene partidas registradas. No se puede sobreescribir.');
      }
    }

    const rowsToInsert = runs.map(run => [
      run.timestamp,
      run.juego,
      run.yo,
      run.media,
      run.nota || ''
    ]);

    await this.updateSheetValues(this.spreadsheetId, `${this.SHEET_NAME}!A2:E${rowsToInsert.length + 1}`, rowsToInsert);
  }

  // Helper method to seed/append bulk runs in one call (used for local migration)
  async appendMultipleRuns(runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]): Promise<void> {
    if (!this.spreadsheetId) throw new Error('ID de hoja de cálculo no configurado.');
    const token = this.getToken();

    await this.initializeSheetStructureIfMissing(this.spreadsheetId);

    const values = runs.map(run => [
      run.timestamp,
      run.juego,
      run.yo,
      run.media,
      run.nota || ''
    ]);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(this.SHEET_NAME + '!A1')}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          range: `${this.SHEET_NAME}!A1`,
          majorDimension: 'ROWS',
          values
        })
      }
    );

    if (!res.ok) {
      throw new Error('No se pudieron añadir las partidas a la hoja de cálculo.');
    }
  }
}
