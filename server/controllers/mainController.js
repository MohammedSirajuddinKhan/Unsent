const Note = require("../models/Note");
const { buildImageSource } = require("../utils/image");
const { escapeRegex, tokenizeSearch } = require("../utils/text");

exports.homepage = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.render("index", {
        title: "Unsent | Saved, not sent.",
        description: "Sign in with Google to manage your notes",
        notes: [],
        search: "",
        pagination: null,
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 6;
    const search = tokenizeSearch(req.query.q).join(" ");

    const filter = {
      user: req.user._id,
    };

    let sort = { updatedAt: -1 };

    if (search) {
      const tokens = tokenizeSearch(search);

      filter.$and = tokens.map((token) => {
        const safeToken = escapeRegex(token);
        const regex = new RegExp(safeToken, "i");

        return {
          $or: [{ title: regex }, { body: regex }],
        };
      });
    }

    const [notes, totalNotes] = await Promise.all([
      Note.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter),
    ]);

    const notesWithImages = notes.map((note) => ({
      ...note,
      imagePreview: buildImageSource(note.image),
    }));

    const totalPages = Math.max(Math.ceil(totalNotes / limit), 1);

    return res.render("index", {
      title: "Unsent | Saved, not sent.",
      description: "Create, search and manage your notes",
      notes: notesWithImages,
      search,
      pagination: {
        page,
        totalPages,
        totalNotes,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: Math.max(page - 1, 1),
        nextPage: Math.min(page + 1, totalPages),
        pages: Array.from({ length: totalPages }, (_, index) => index + 1),
      },
    });
  } catch (error) {
    next(error);
  }
};
