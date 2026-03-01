; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_glob_const begin
byte_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld A, (glob_bytes + 1)         ; 010B: 3A 00 00
ld (glob_bytes + 2), A         ; 010E: 32 00 00
ld H, $0000                    ; 0111: 26 00
ld L, A                        ; 0113: 6F
__zax_epilogue_0:
pop DE                         ; 0114: D1
pop BC                         ; 0115: C1
pop AF                         ; 0116: F1
ld SP, IX                      ; 0117: DD F9
pop IX                         ; 0119: DD E1
ret                            ; 011B: C9
; func byte_glob_const end
; func main begin
main:
push IX                        ; 011C: DD E5
ld IX, $0000                   ; 011E: DD 21 00 00
add IX, SP                     ; 0122: DD 39
push AF                        ; 0124: F5
push BC                        ; 0125: C5
push DE                        ; 0126: D5
push HL                        ; 0127: E5
call byte_glob_const           ; 0128: CD 00 00
__zax_epilogue_1:
pop HL                         ; 012B: E1
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld SP, IX                      ; 012F: DD F9
pop IX                         ; 0131: DD E1
ret                            ; 0133: C9
; func main end

; symbols:
; label byte_glob_const = $0100
; label __zax_epilogue_0 = $0114
; label main = $011C
; label __zax_epilogue_1 = $012B
; data glob_bytes = $2000
