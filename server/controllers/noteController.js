const Note = require("../models/Note");

function renderForm(res, view, title, note, error) {
  return res.status(400).render(view, {
    title,
    description: title,
    note,
    pageFlashMessages: [{ type: "error", message: error }],
  });
}

exports.newNote = (req, res) => {
  res.render("notes/new", {
    title: "Add Note",
    description: "Create a note",
    note: {
      title: "",
      body: "",
    },
    error: null,
  });
};

exports.createNote = async (req, res, next) => {
  try {
    const title = (req.body.title || "").trim();
    const body = (req.body.body || "").trim();

    if (!title || !body) {
      return renderForm(
        res,
        "notes/new",
        "Add Note",
        { title, body },
        "Title and content are required.",
      );
    }

    const note = await Note.create({
      title,
      body,
      user: req.user._id,
    });

    res.flash("success", "Note created successfully.");

    return res.redirect(`/notes/${note._id}`);
  } catch (error) {
    next(error);
  }
};

exports.showNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.render("notes/show", {
      title: note.title,
      description: "View note",
      note,
    });
  } catch (error) {
    next(error);
  }
};

exports.editNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.render("notes/edit", {
      title: "Edit Note",
      description: "Update note",
      note,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const title = (req.body.title || "").trim();
    const body = (req.body.body || "").trim();

    if (!title || !body) {
      return renderForm(
        res,
        "notes/edit",
        "Edit Note",
        { _id: req.params.id, title, body },
        "Title and content are required.",
      );
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, body },
      { new: true, runValidators: true },
    );

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.flash("success", "Note updated successfully.");

    return res.redirect(`/notes/${note._id}`);
  } catch (error) {
    next(error);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.flash("success", "Note deleted successfully.");

    return res.redirect("/");
  } catch (error) {
    next(error);
  }
};
