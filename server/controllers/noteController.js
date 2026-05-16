const Note = require("../models/Note");
const { normalizeWhitespace } = require("../utils/text");
const { buildImageRecord, buildImageSource } = require("../utils/image");

function normalizeNoteForForm(note) {
  return {
    ...note,
    imagePreview: note?.image ? buildImageSource(note.image) : null,
  };
}

function getImagePayload(req) {
  const file = req.file;
  const removeImage = req.body.removeImage === "on";

  if (removeImage) {
    return null;
  }

  if (!file) {
    return undefined;
  }

  const imageAlt = normalizeWhitespace(
    req.body.imageAlt || req.body.title || "Attached file",
  );
  return buildImageRecord(file, imageAlt);
}

function renderForm(res, view, title, note, error) {
  return res.status(400).render(view, {
    title,
    description: title,
    note: normalizeNoteForForm(note),
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
      imagePreview: null,
    },
    error: null,
  });
};

exports.createNote = async (req, res, next) => {
  try {
    const title = normalizeWhitespace(req.body.title);
    const body = String(req.body.body || "").trim();

    if (!title || !body) {
      return renderForm(
        res,
        "notes/new",
        "Add Note",
        { title, body, imagePreview: null },
        "Title and content are required.",
      );
    }

    const image = getImagePayload(req);

    const noteData = {
      title,
      body,
      user: req.user._id,
    };

    if (image !== undefined) {
      noteData.image = image;
    }

    const note = await Note.create(noteData);

    res.flash("success", "Note created successfully.");

    return res.redirect(`/notes/${note._id}`);
  } catch (error) {
    next(error);
  }
};

exports.showNote = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!(req.user && req.user.isAdmin)) {
      query.user = req.user._id;
    }

    const note = await Note.findOne(query).lean();

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.render("notes/show", {
      title: note.title,
      description: "View note",
      note: {
        ...note,
        imagePreview: buildImageSource(note.image),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.editNote = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!(req.user && req.user.isAdmin)) {
      query.user = req.user._id;
    }

    const note = await Note.findOne(query).lean();

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.render("notes/edit", {
      title: "Edit Note",
      description: "Update note",
      note: normalizeNoteForForm(note),
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const title = normalizeWhitespace(req.body.title);
    const body = String(req.body.body || "").trim();

    if (!title || !body) {
      return renderForm(
        res,
        "notes/edit",
        "Edit Note",
        { _id: req.params.id, title, body, imagePreview: null },
        "Title and content are required.",
      );
    }

    const image = getImagePayload(req);
    const updateData = { title, body };

    if (image !== undefined) {
      updateData.image = image;
    }

    const filter = { _id: req.params.id };
    if (!(req.user && req.user.isAdmin)) {
      filter.user = req.user._id;
    }

    const note = await Note.findOneAndUpdate(filter, updateData, {
      new: true,
      runValidators: true,
    });

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
    let note;
    if (req.user && req.user.isAdmin) {
      note = await Note.findByIdAndDelete(req.params.id);
    } else {
      note = await Note.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });
    }

    if (!note) {
      return res.status(404).send("Note not found");
    }

    res.flash("success", "Note deleted successfully.");

    return res.redirect("/");
  } catch (error) {
    next(error);
  }
};
