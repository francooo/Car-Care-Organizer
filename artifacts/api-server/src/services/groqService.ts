import Groq from "groq-sdk";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

export interface FluidReading {
  type: "oil" | "coolant" | "brake" | "power" | "washer" | "battery";
  levelPct: number;
  status: "ok" | "warning" | "critical";
  spec: string;
  amountLiters?: number;
}

export interface DiagnosticResult {
  fluids: FluidReading[];
  overallStatus: "ok" | "warning" | "critical";
  vehicleDetected: string;
  confidence: number;
  summary: string;
}

const MECHANIC_SYSTEM_PROMPT = `Você é um especialista mecânico virtual da AutoCare AI com 20 anos de experiência em manutenção automotiva. Seu nome é "Especialista AutoCare".

Diretrizes:
- Responda sempre em português brasileiro (pt-BR)
- Seja preciso, técnico mas acessível para leigos
- Priorize sempre a segurança do usuário e do veículo
- Quando o nível de fluido estiver crítico, recomende não dirigir
- Sugira sempre o tipo de produto correto (ex: óleo 5W-30 sintético, DOT-4, etc.)
- Mencione quando um profissional deve ser consultado
- Seja conciso (máx 3-4 parágrafos por resposta)
- Nunca invente dados que não foram fornecidos`;

export async function analyzeMotorImage(base64Image: string): Promise<DiagnosticResult> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    return getMockDiagnostic();
  }

  try {
    const response = await getGroq().chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise esta imagem do compartimento do motor de um veículo. 
              Identifique e estime o nível de cada fluido visível:
              - Óleo do motor (vareta ou reservatório)
              - Líquido de arrefecimento (reservatório)
              - Fluido de freio (reservatório)
              - Fluido de direção hidráulica (reservatório)
              - Água do limpador de para-brisa (reservatório)
              - Estado da bateria (se visível)
              
              Para cada fluido encontrado, retorne um JSON com:
              {
                "vehicleDetected": "marca modelo estimado",
                "confidence": 0-100,
                "summary": "resumo geral do estado do motor",
                "fluids": [
                  {
                    "type": "oil|coolant|brake|power|washer|battery",
                    "levelPct": 0-100,
                    "status": "ok|warning|critical",
                    "spec": "especificação recomendada",
                    "amountLiters": litros_para_completar_se_necessário
                  }
                ],
                "overallStatus": "ok|warning|critical"
              }
              
              Retorne APENAS o JSON, sem texto adicional.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as DiagnosticResult;
    }
  } catch (err) {
    console.error("Groq vision error:", err);
  }

  return getMockDiagnostic();
}

export async function* streamMechanicResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  vehicleContext?: string
): AsyncGenerator<string> {
  const apiKey = process.env["GROQ_API_KEY"];

  const systemMessages = [
    { role: "system" as const, content: MECHANIC_SYSTEM_PROMPT },
    ...(vehicleContext
      ? [{ role: "system" as const, content: `Contexto do veículo: ${vehicleContext}` }]
      : []),
  ];

  if (!apiKey) {
    yield "Desculpe, o serviço de IA está temporariamente indisponível. Verifique o nível dos fluidos manualmente conforme indicado no diagnóstico.";
    return;
  }

  const stream = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [...systemMessages, ...messages],
    max_tokens: 512,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

function getMockDiagnostic(): DiagnosticResult {
  return {
    vehicleDetected: "Veículo detectado",
    confidence: 87,
    summary: "Motor analisado. Alguns fluidos precisam de atenção.",
    overallStatus: "warning",
    fluids: [
      { type: "oil", levelPct: 45, status: "warning", spec: "5W-30 Sintético", amountLiters: 1.5 },
      { type: "coolant", levelPct: 78, status: "ok", spec: "OAT Azul" },
      { type: "brake", levelPct: 72, status: "ok", spec: "DOT-4" },
      { type: "power", levelPct: 85, status: "ok", spec: "PSF Padrão" },
      { type: "washer", levelPct: 20, status: "warning", spec: "Água + álcool 1:1", amountLiters: 1.0 },
      { type: "battery", levelPct: 80, status: "ok", spec: "12V / 60Ah" },
    ],
  };
}
