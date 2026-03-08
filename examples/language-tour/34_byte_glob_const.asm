; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_glob_const begin
byte_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld HL, glob_bytes + 1          ; 010E: 21 00 00
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
ld A, (hl)                     ; 0114: 7E
push AF                        ; 0115: F5
push BC                        ; 0116: C5
push DE                        ; 0117: D5
ld HL, glob_bytes + 2          ; 0118: 21 00 00
pop DE                         ; 011B: D1
pop BC                         ; 011C: C1
pop AF                         ; 011D: F1
ld (hl), A                     ; 011E: 77
ld H, $0000                    ; 011F: 26 00
ld L, A                        ; 0121: 6F
__zax_epilogue_0:
pop DE                         ; 0122: D1
pop BC                         ; 0123: C1
pop AF                         ; 0124: F1
ld SP, IX                      ; 0125: DD F9
pop IX                         ; 0127: DD E1
ret                            ; 0129: C9
; func byte_glob_const end
; func main begin
main:
push IX                        ; 012A: DD E5
ld IX, $0000                   ; 012C: DD 21 00 00
add IX, SP                     ; 0130: DD 39
push AF                        ; 0132: F5
push BC                        ; 0133: C5
push DE                        ; 0134: D5
push HL                        ; 0135: E5
call byte_glob_const           ; 0136: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0139: E1
pop DE                         ; 013A: D1
pop BC                         ; 013B: C1
pop AF                         ; 013C: F1
ld SP, IX                      ; 013D: DD F9
pop IX                         ; 013F: DD E1
ret                            ; 0141: C9
; func main end

; symbols:
; label byte_glob_const = $0100
; label __zax_epilogue_0 = $0122
; label main = $012A
; label __zax_epilogue_1 = $0139
; data glob_bytes = $2000
; label __zax_startup = $2008
