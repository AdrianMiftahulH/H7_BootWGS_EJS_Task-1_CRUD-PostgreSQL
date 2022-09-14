const { name } = require('ejs');
const { urlencoded } = require('express');
const express = require('express')
const app = express();
var expressLayouts = require('express-ejs-layouts');
const port = 3000;
const fs = require('fs');
const { dirname } = require('path');
const path = require('path')
const { body, validationResult, check } = require('express-validator');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
var morgan = require('morgan');

// Memanggil db
const pool = require("./db");
app.use(express.json());

// app.get("/addasync", async (req, res) => {
//     try {
//         const name = "adriana"
//         const mobile = "089656104174"
//         const email = "adrianmi@gmail.com"
//         const newCont = await pool.query(`INSERT INTO contacts values('${name}', '${email}', '${mobile}') RETURNING *`)
//         res.json(newCont)
//         console.log(newCont)
//     } catch (err) {
//         console.error(err.message)
//     }
// })
app.use(express.static('public'))
app.use(express.json())
app.set('view engine', 'ejs')
app.use(expressLayouts);
app.set('layout', 'layouts/layout');
app.use(express.urlencoded());
app.use(cookieParser('secret'));
app.use(
    session({
        cookie: { maxAge: 6000 },
        secret: 'secret',
        resave: true,
        saveUninitialized: true,
    })
);
app.use(flash())
app.use((req, res, next) => {
    console.log('Time:', Date.now())
    next()
})
app.use(morgan(function (tokens, req, res) {
    return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens['response-time'](req, res), 'ms'
    ].join(' ')
}));

// Membuat folder data jika belom ada
const dirPatch = './data';
if (!fs.existsSync(dirPatch)) {
    fs.mkdirSync(dirPatch);
}

// Mendapatakan semua data dari json
const getContact = async() => {
    const contacts = await pool.query(`SELECT * FROM contact`)
    return contacts.rows
}
// Cek nama Bila sudah ada
const cekDuplikat = async (name) => {
    var existAccounts = await getContact();
    console.log(existAccounts)
    return existAccounts.find((user) => user.name.toLowerCase() === name.toLowerCase());
}

// Mendapatkan nama sesuai di cari
const findContact = async(name) => {
    const contacts = await getContact();
    const contact = contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase());
    return contact;
}


// Halaman Home
app.get('/', (req, res) => {
    res.render('index', {
        title: "Home Page",
        layout: 'layout/main'
    })
})

// Halaman about
app.get('/about', (req, res) => {
    res.render('about', {
        title: "About Page",
        layout: 'layout/main'
    })
})

// Halaman contact
app.get('/contact', async (req, res) => {
    const cont = await getContact()
    res.render('contact', {
        title: "Contact Page",
        layout: 'layout/main',
        cont: cont,
        msg: req.flash('msg')
    })
})

// halaman form add contact
app.get('/contact/add', async (req, res) => {
    const cont = await getContact()

    res.render('add-contact', {
        title: "Form Tambah Kontak",
        layout: 'layout/main',
        cont,
    })
})

// Menyimpan data baru
app.post(
    '/contact/add/saveContact',
    [
        body('name').custom(async(value) => {
            const duplikat = await cekDuplikat(value);
            console.log(duplikat)
            if (duplikat) {
                throw new Error('Name already in use')
            }
            return true;
        }),
        check('email', 'Email Invalid!').isEmail(),
        check('mobile', 'Mobile Invalid!').isMobilePhone('id-ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.render('add-contact', {
                title: "Form Tambah Kontak",
                layout: 'layout/main',
                errors: errors.array()
            })
        } else {
            const contData = req.body
            const newCont = await pool.query(`INSERT INTO contact values('${contData.name}', '${contData.email}', '${contData.mobile}') RETURNING *`)
            // Mengirim 
            req.flash('msg', 'Data telah di tambahkan');
            // Untuk kembali ke file yang di tuju
            res.redirect('/contact');
        }
    })



// Mengedit data
app.get('/contact/edit/:name', async(req, res) => {
    const name = req.params.name
    const contacts = await findContact(name)
    console.log(contacts)
    res.render('edit', {
        title: "Edit Contact",
        layout: 'layout/main',
        contacts
    })
})

// aksi mengedit data
app.post(
    '/contact/update',
    [
        body('name').custom(async(value, { req }) => {
            const duplikat = await cekDuplikat(value);

            if (value != req.body.oldnama && duplikat) {
                throw new Error('Name already in use')
            }
            return true;
        }),
        check('email', 'Email Invalid!').isEmail(),
        check('mobile', 'Mobile Invalid!').isMobilePhone('id-ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.render('edit', {
                title: "Form Edit Kontak",
                layout: 'layout/main',
                errors: errors.array(),
                contacts: req.body,
            })
        } else {
            const newCont = await pool.query(`UPDATE contact SET name=$1, email=$2, mobile=$3 WHERE name =$4`, [req.body.name, req.body.email, req.body.mobile, req.body.oldnama])

            res.redirect('/contact')
        }

    })

// Menghapus data
app.get('/contact/delete/:name', (req, res) => {
    // Membuat var untuk mengambil parameter
    const name = req.params.name

    pool.query('DELETE FROM contact WHERE name = $1', [name])
    req.flash('msg', 'Data telah di hapus');
    res.redirect('/contact');
})

app.get('/menu', (req, res) => {
    res.render('menu', {
        nama: 'adrian',
        title: "Menu",
        layout: 'layout/main'
    })
})
// Untuk memanggil sebuah id
app.get(('/product/:id/'), (req, res) => {
    res.send(`product id : ${req.params.id}, id category ${req.query.idCategory}`)
})
app.use('/', (req, res) => {
    res.status(404)
    res.send(`page not found`)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})