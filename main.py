from fastapi import FastAPI
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base
from sqladmin import Admin, ModelView
engine = create_engine(
    "sqlite:///example.db", 
    connect_args={"check_same_thread": False} 
)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    email = Column(String(50), unique=True)

Base.metadata.create_all(engine)


app = FastAPI()


admin = Admin(app, engine)

class UserAdmin(ModelView, model=User):

    column_list = [User.id, User.name, User.email]
    column_searchable_list = [User.name, User.email]
    
    icon = "fa-solid fa-user"

admin.add_view(UserAdmin)

@app.get("/")
def read_root():
    return {"message": "Go to /admin to see the admin panel"}