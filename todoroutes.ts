// require the express module
import express from "express";
import pg from "pg-promise";
const Joi = require("joi");

const db = pg()({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "your password",
  database: "socialtodos",
});

const schema = Joi.object({
  title: Joi.string().min(1).max(100).required(),

  description: Joi.string().min(1).max(500),

  due_date: Joi.date().greater("now").iso(),

  completed: Joi.boolean().required(),
  user_id: Joi.number().integer(),
});

// create a new Router object
const routes = express.Router();

routes.get("/todos", (req, res) => {
  db.manyOrNone("select * from todos")
    .then((data) => res.json(data))
    .catch((error) => console.log(error));
});

routes.get("/todos/:id", (req, res) => {
  db.oneOrNone("SELECT * FROM todos WHERE id = ${id}", { id: req.params.id })
    .then((todos) => res.json(todos))
    .catch((error) => console.log(error));
});

// adding a sneaker to the postgres table 'sneakers'
routes.post("/todos", (req, res) => {
  const todo = {
    title: req.body.title,
    description: req.body.description,
    due_date: req.body.due_date,
    completed: req.body.completed,
    user_id: req.body.user_id,
  };
  const valid = schema.validate(todo);

  if (valid.error) {
    return res.status(400).send(valid.error);
  }

  db.one(
    "INSERT INTO todos(title, description, due_date, completed, user_id) VALUES(${title}, ${description}, ${due_date}, ${completed}, ${user_id}) returning id",
    todo
  )
    .then((id) => {
      return db.oneOrNone("SELECT * FROM todos WHERE id = ${id}", {
        id: id.id,
      });
    })
    .then((data) => res.json(data))

    .catch((error) => res.status(500).send(error));
});

// deleting a todo by the id
routes.delete("/todos/:id", (req, res) => {
  db.many("select * from todos")
    .then((todo) => {
      let elem: any = todo.find((s) => s.id === +req.params.id);

      if (!elem) {
        res.status(404).json({ error: "Todo not found" });
      } else {
        db.none("delete from todos where id = ${id}", {
          id: +req.params.id,
        });

        res
          .status(200)
          .json({ message: `Todo with id ${+req.params.id} deleted` });
      }
    })

    .catch((error) => console.log(error));
});

// updating a todo by todo id
routes.put("/todos/:id", (req, res) => {
  db.many("select * from todos")
    .then((todo) => {
      let elem: any = todo.find((s) => s.id === +req.params.id);

      if (!elem) {
        res.status(404).json({ error: "Todo not found" });
      } else {
        db.none(
          "update todos set id=${id}, title=${title}, description=${description}, due_date=${due_date}, completed=${completed}, user_id=${user_id} where id = ${id}",
          {
            id: +req.params.id,
            title: req.body.title,
            description: req.body.description,
            due_date: req.body.due_date,
            completed: req.body.completed,
            user_id: req.body.user_id,
          }
        );

        res.send(req.body);
      }
    })

    .catch((error) => console.log(error));
});

export default routes;
