; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_glob_const begin
word_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
ld DE, (glob_words + 2)        ; 010C: ED 5B 00 00
push HL                        ; 0110: E5
push DE                        ; 0111: D5
ld de, glob_words              ; 0112: 11 00 00
ld HL, $0002                   ; 0115: 21 02 00
add HL, HL                     ; 0118: 29
add HL, DE                     ; 0119: 19
pop DE                         ; 011A: D1
ld (HL), E                     ; 011B: 73
inc HL                         ; 011C: 23
ld (HL), D                     ; 011D: 72
pop HL                         ; 011E: E1
pop DE                         ; 011F: D1
ld HL, (glob_words + 4)        ; 0120: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 0123: D1
pop BC                         ; 0124: C1
pop AF                         ; 0125: F1
ld SP, IX                      ; 0126: DD F9
pop IX                         ; 0128: DD E1
ret                            ; 012A: C9
; func main begin
; func word_glob_const end
main:
push IX                        ; 012B: DD E5
ld IX, $0000                   ; 012D: DD 21 00 00
add IX, SP                     ; 0131: DD 39
push AF                        ; 0133: F5
push BC                        ; 0134: C5
push DE                        ; 0135: D5
push HL                        ; 0136: E5
call word_glob_const           ; 0137: CD 00 00
__zax_epilogue_1:
pop HL                         ; 013A: E1
pop DE                         ; 013B: D1
pop BC                         ; 013C: C1
pop AF                         ; 013D: F1
ld SP, IX                      ; 013E: DD F9
pop IX                         ; 0140: DD E1
ret                            ; 0142: C9
; func main end

; symbols:
; label word_glob_const = $0100
; label __zax_epilogue_0 = $0123
; label main = $012B
; label __zax_epilogue_1 = $013A
; data glob_words = $2000
; label __zax_startup = $2010
