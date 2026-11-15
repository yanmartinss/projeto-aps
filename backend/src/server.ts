import { app } from "./app.js";

const porta = Number(process.env.PORT ?? 3333);
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));
