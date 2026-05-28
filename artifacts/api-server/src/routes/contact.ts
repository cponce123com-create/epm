import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, contactsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ContactBody = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  email: z.string().email("Email inválido"),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(5000),
});

router.post("/contact", async (req: Request, res: Response): Promise<void> => {
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos: " + parsed.error.message });
    return;
  }

  const { name, email, message } = parsed.data;

  try {
    await db.insert(contactsTable).values({ name, email, message });
    logger.info({ email, name }, "New contact message");
    res.status(201).json({ ok: true, message: "Mensaje recibido. Te responderemos pronto." });
  } catch (err) {
    logger.error({ err }, "Error saving contact message");
    res.status(500).json({ error: "Error al guardar el mensaje." });
  }
});

export default router;
